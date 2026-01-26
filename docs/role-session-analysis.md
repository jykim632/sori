# Role과 세션 구조 분석 보고서

> 작성일: 2026-01-11
> 주제: 멀티테넌트 환경에서 Role이 세션에 포함되지 않는 이유 검토

---

## 1. 개요

### 1.1 배경

Sori는 멀티테넌트 SaaS로, 한 사용자가 여러 조직에 속할 수 있다. 현재 role 정보는 세션에 포함되지 않고 매 요청마다 DB에서 조회하는 방식을 사용하고 있다.

### 1.2 검토 질문

- Role이 세션에 포함되지 않는 이유는 무엇인가?
- 조직별로 다른 role이 필요한가?

---

## 2. 현재 시스템 구조

### 2.1 데이터베이스 스키마

```
users (better-auth 관리)
├── id
├── email
└── name

organization
├── id
├── name
├── slug
└── ...

organization_member (조직별 멤버십)
├── id
├── userId
├── organizationId
├── role (OWNER | ADMIN | MEMBER)
└── createdAt
```

### 2.2 Role 타입

```typescript
// packages/database/src/schemas/enums.ts
type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
```

### 2.3 세션 구조

```typescript
// apps/web/src/lib/auth.ts
export const auth = betterAuth({
  session: {
    fields: {
      userId,
      expiresAt,
      createdAt,
      updatedAt,
      ipAddress,
      userAgent
    }
  }
});
```

**세션에 포함된 정보:**
- `user.id`, `user.email`, `user.name`
- `userId`, `expiresAt`, `ipAddress`, `userAgent`

**세션에 포함되지 않은 정보:**
- role (조직별 권한)

---

## 3. 권한 검증 구현

### 3.1 핵심 함수

```typescript
// apps/web/src/server/auth-helpers.ts

export async function requireOrgMembership(organizationId: string): Promise<{
  userId: string;
  role: string;
}> {
  const userId = await getSessionUserId();
  const { getCachedRole } = await import("@/lib/role-cache");
  const role = await getCachedRole(userId, organizationId);

  if (!role) {
    throw new AppError("AUTH_NOT_MEMBER");
  }

  return { userId, role };
}

export async function requireOrgAdmin(organizationId: string): Promise<{
  userId: string;
  role: string;
}> {
  const { userId, role } = await requireOrgMembership(organizationId);

  if (role !== "OWNER" && role !== "ADMIN") {
    throw new AppError("AUTH_ADMIN_REQUIRED");
  }

  return { userId, role };
}
```

### 3.2 캐싱 메커니즘

```typescript
// apps/web/src/lib/role-cache.ts

const roleCache = new WeakMap<Request, Map<string, Promise<string | null>>>();

export async function getCachedRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const request = getRequest();
  const cacheKey = `${userId}:${organizationId}`;

  // 같은 request 내에서는 DB 조회 1번만 발생
  if (!requestCache.has(cacheKey)) {
    const promise = getUserRoleInOrganization(userId, organizationId);
    requestCache.set(cacheKey, promise);
  }

  return requestCache.get(cacheKey)!;
}
```

**동작 원리:**
1. 매 요청마다 세션에서 `userId`만 추출
2. 조직별 권한이 필요할 때 `userId` + `organizationId`로 DB 조회
3. 같은 request 내에서는 WeakMap으로 캐싱
4. Request 종료 후 GC에 의해 자동 정리

### 3.3 권한 검증 플로우

```
사용자 요청
    ↓
getSessionUserId() ← 세션에서 userId만 추출
    ↓
requireOrgMembership(orgId)
    ├─ getCachedRole(userId, orgId)
    │   ├─ 첫 호출: DB 조회 후 WeakMap에 캐싱
    │   └─ 재호출: 캐시에서 반환
    ├─ role 확인
    └─ 실패 시: throw AppError("AUTH_NOT_MEMBER")
    ↓
권한이 필요한 작업 수행
```

---

## 4. Role을 세션에 포함하지 않는 이유

### 4.1 멀티테넌트 특성

한 사용자가 여러 조직에 속할 수 있고, 각 조직에서 다른 role을 가질 수 있다.

```
User: john@example.com
├── Org A (자기 회사)    → role: OWNER (풀 권한)
├── Org B (클라이언트)   → role: ADMIN (관리 권한)
└── Org C (파트너사)     → role: MEMBER (읽기 권한)
```

"어떤 role?"이라는 질문에 "어느 조직에서?"가 답에 포함되어야 하므로, role은 세션의 고정 속성이 될 수 없다.

### 4.2 권한 변경 실시간 반영

| 방식 | 권한 변경 반영 시점 |
|------|---------------------|
| 세션에 role 저장 | 로그아웃 후 재로그인 필요 |
| **매 요청마다 조회** | **즉시 반영** |

예: 관리자가 A 사용자를 MEMBER → ADMIN으로 승격하면 A의 다음 요청부터 즉시 반영됨.

### 4.3 보안

- 세션에 role을 넣으면 클라이언트가 JWT/쿠키를 통해 role 정보 확인 가능
- 현재 방식: 권한 조회를 서버 함수에서만 수행하므로 클라이언트에 노출되지 않음

### 4.4 성능 최적화

WeakMap 기반 request-scoped 캐싱으로 성능 저하 없음:

```typescript
// 같은 request 내에서 여러 번 호출해도 DB 조회 1번만
await requireOrgMembership(orgId);      // DB 조회
await requireOrgMembership(orgId);      // 캐시에서 반환
await requireOrgAdmin(orgId);           // 캐시에서 반환
```

---

## 5. 조직별 Role의 필요성

### 5.1 결론: 필요함

멀티테넌트 SaaS에서 조직별 role은 표준 패턴이다.

**실제 사례:**
- Slack: 워크스페이스별 관리자/멤버
- Notion: 팀스페이스별 권한
- Linear: 조직별 역할
- GitHub: 조직별 Owner/Member

### 5.2 현재 구현 확인

```typescript
// apps/web/src/routes/admin.tsx
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ search }) => {
    const [session, organizations] = await Promise.all([
      getSession(),
      getUserOrganizations(),  // 모든 조직 + 각 role 조회
    ]);

    return { session, organizations, currentOrg };
  },
});

// 드롭다운에서 조직별 role 표시
{organizations.map((org) => (
  <button key={org.id}>
    <span>{org.name}</span>
    <span className="text-xs text-gray-500 uppercase">{org.role}</span>
  </button>
))}
```

---

## 6. 비교 분석

| 측면 | 현재 방식 (Role 세션 미포함) | 세션에 포함 시 |
|------|------------------------------|----------------|
| **멀티테넌트** | ✅ 조직별 role 자동 관리 | ❌ 어느 조직 role 저장할지 불명확 |
| **권한 변경** | ✅ 즉시 반영 | ❌ 로그아웃까지 미반영 |
| **성능** | ✅ WeakMap 캐싱으로 최적화 | ✅ 캐시에서 조회 |
| **보안** | ✅ 서버에서만 검증 | ⚠️ 클라이언트 노출 위험 |
| **메모리** | ✅ Request GC시 자동 정리 | ❌ 세션 수명만큼 유지 |
| **복잡도** | ⚠️ 매 요청마다 조회 로직 | ✅ 세션에서 바로 읽기 |

---

## 7. 대안 검토

### 7.1 글로벌 Role (조직 무관)

만약 모든 조직에서 동일한 role이 필요하다면:

```typescript
// users 테이블에 role 추가
users
├── id
├── email
├── name
└── role (ADMIN | MEMBER)  // 글로벌 role

// 세션에 포함
session: {
  userId,
  role  // 추가
}
```

**장점:**
- 구현 단순화
- DB 조회 없이 권한 확인

**단점:**
- 멀티테넌트 유연성 상실
- 향후 요구사항 변경 시 마이그레이션 필요

### 7.2 하이브리드 방식

```typescript
// 글로벌 role (시스템 관리자용) + 조직별 role
users.role: "SUPER_ADMIN" | "USER"
organization_member.role: "OWNER" | "ADMIN" | "MEMBER"
```

시스템 전체 관리자와 조직별 관리자를 분리.

---

## 8. 결론 및 권장사항

### 8.1 평가

**현재 설계: 적절함 (5/5)**

1. Role이 세션에 없는 것은 **의도된 멀티테넌트 설계**
2. 조직별로 다른 role은 **SaaS 표준 패턴**이며 현재 완전히 구현됨
3. 권한 변경 실시간 반영, WeakMap 캐싱으로 성능도 우수
4. 서버 함수에서만 검증하므로 보안도 견고함

### 8.2 권장사항

| 권장 | 설명 |
|------|------|
| ✅ 현재 방식 유지 | 변경 불필요 |
| 📌 고려사항 | 시스템 관리자 기능 필요 시 하이브리드 방식 검토 |

---

## 9. 참조 파일

| 파일 | 역할 |
|------|------|
| `apps/web/src/server/auth-helpers.ts` | 권한 검증 핵심 로직 |
| `apps/web/src/lib/role-cache.ts` | Request-scoped role 캐싱 |
| `apps/web/src/lib/auth.ts` | better-auth 설정 |
| `packages/database/src/queries/organization.ts` | `getUserRoleInOrganization` 쿼리 |
| `packages/database/src/schemas/enums.ts` | MemberRole 타입 정의 |
| `apps/web/src/routes/admin.tsx` | 조직별 role 표시 예시 |

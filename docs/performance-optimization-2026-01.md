# 성능 최적화 작업 기록 (2026-01)

## 문제 현상

- `/admin/feedbacks` 페이지 전환이 느림
- Supabase(PostgreSQL) 속도 문제인지 확인 필요

---

## 분석 과정

### 1단계: 성능 측정 도구 구현

기존에 쿼리 타이밍 측정 기능이 없어서 먼저 구현.

**수정 파일**: `packages/database/src/client.ts`

```typescript
// 환경변수로 제어
const perfConfig = {
  enabled: process.env.PERF_LOGGING === "true",
  slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_MS || "100", 10),
  logAllQueries: process.env.PERF_LOG_ALL === "true",
};
```

**환경변수 설정** (`.env.local`):
```bash
PERF_LOGGING=true
SLOW_QUERY_MS=100
PERF_LOG_ALL=true
```

**로그 출력 예시**:
```
[SLOW] {"type":"db_query","name":"SELECT COUNT(*) as total FROM feedback","ms":234,"rows":1}
[PERF] {"type":"db_query","name":"SELECT f.id, f.type...","ms":45,"rows":20}
```

### 2단계: 문제 발견

페이지 한 번 접속에 **20-30개 쿼리** 실행됨.

**원인 분석**:

| 원인 | 설명 | 영향 |
|------|------|------|
| `preload="viewport"` | 탭 3개가 화면에 보이면 각각 loader 실행 | 쿼리 3배 |
| 조직 전체 피드백 조회 | 프로젝트 필터 없이 모든 피드백 조회 | 데이터량 증가 시 악화 |
| role 중복 조회 | `requireOrgMembership()` 매번 DB 조회 | 요청당 중복 쿼리 |

---

## 해결 방안

### 1. Preload 제거

**수정 파일**: `apps/web/src/routes/admin.tsx`

```diff
- <Link to="/admin/feedbacks" preload="viewport" ...>
+ <Link to="/admin/feedbacks" ...>
```

탭 네비게이션 3곳에서 `preload="viewport"` 제거.

**효과**: 페이지 로드 시 현재 탭만 쿼리 → 쿼리 3배 감소

### 2. 프로젝트 기본값 변경

**수정 파일**: `apps/web/src/routes/admin/feedbacks.tsx`

**변경 전**:
- 기본값: 조직 전체 피드백 (프로젝트 필터 없음)

**변경 후**:
- 기본값: 첫 번째 프로젝트의 피드백
- "전체" 옵션: `value="all"`로 명시적 선택

```typescript
// loader 로직
if (deps.projectId === "all") {
  // 전체 프로젝트 조회
} else if (deps.projectId) {
  // 특정 프로젝트 조회
} else {
  // 기본값: 첫 번째 프로젝트
  const projects = await getProjects({ data: { organizationId: orgId } });
  const defaultProjectId = projects[0]?.id;
  // defaultProjectId로 feedbacks 조회
}
```

**효과**: 데이터량 감소, 페이지 로드 속도 개선

### 3. Role 쿼리 캐싱

**신규 파일**: `apps/web/src/lib/role-cache.ts`

```typescript
const roleCache = new WeakMap<Request, Map<string, Promise<string | null>>>();

export async function getCachedRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const request = getRequest();
  const cacheKey = `${userId}:${organizationId}`;

  // 같은 request 내에서는 캐싱된 결과 반환
  if (!requestCache.has(cacheKey)) {
    requestCache.set(cacheKey, getUserRoleInOrganization(userId, organizationId));
  }
  return requestCache.get(cacheKey);
}
```

**수정 파일**: `apps/web/src/server/auth-helpers.ts`

```diff
- const { getUserRoleInOrganization } = await import("@sori/database");
- const role = await getUserRoleInOrganization(userId, organizationId);
+ const { getCachedRole } = await import("@/lib/role-cache");
+ const role = await getCachedRole(userId, organizationId);
```

**효과**: 같은 요청 내 role 중복 조회 제거

---

## 변경된 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `packages/database/src/client.ts` | 성능 로깅 추가 |
| `apps/web/src/routes/admin.tsx` | preload 제거 |
| `apps/web/src/routes/admin/feedbacks.tsx` | 프로젝트 기본값 로직 |
| `apps/web/src/routes/admin/projects/index.tsx` | preload="intent" 제거 |
| `apps/web/src/lib/role-cache.ts` | 신규 - role 캐싱 |
| `apps/web/src/server/auth-helpers.ts` | getCachedRole 사용 |

---

## 결과

### Before
- 페이지 로드 시 20-30개 쿼리
- preload로 인한 3배 쿼리
- role 중복 조회

### After
- 필요한 쿼리만 실행
- 현재 탭만 로드
- role 캐싱으로 중복 제거
- 첫 번째 프로젝트 기본 선택으로 데이터량 감소

---

## 향후 고려사항

1. **성능 로깅 비활성화**: 프로덕션에서는 `PERF_LOGGING=false` 유지
2. **쿼리 최적화**: 느린 쿼리 (100ms+) 발견 시 인덱스 검토
3. **페이지네이션**: 피드백 데이터 증가 시 페이지 크기 조정 검토

---

## 참고: 세션 구조

better-auth 세션에는 조직 role이 포함되지 않음 (의도된 설계):
- 사용자는 여러 조직에 속할 수 있음
- 각 조직에서 다른 role 가능 (OWNER, ADMIN, MEMBER)
- 따라서 조직별 role은 별도 조회 필요 → 캐싱으로 해결

```typescript
// 세션 필드 (auth.ts)
session: {
  fields: {
    userId, expiresAt, createdAt, updatedAt, ipAddress, userAgent
  }
}
// 조직 role은 organization_members 테이블에서 조회
```

# URL 구조 변경: org를 querystring에서 path로

## 배경

현재 조직(org) 구분을 querystring으로 처리하고 있다.

```
현재: /admin/feedbacks?org=xxx
```

이를 path parameter로 변경한다.

```
변경: /{orgId}/admin/feedbacks
```

## 변경 이유

| 관점 | 개선 효과 |
|------|----------|
| 코드 품질 | validateSearch 5곳 제거, navigate 10곳 간소화 |
| UX | URL만 봐도 어느 조직인지 명확 |
| 공유/북마크 | querystring 누락 없이 org 정보 유지 |
| 라우팅 | TanStack Router의 params 상속으로 일관성 향상 |

## 라우트 구조 변경

### Before

```
routes/
├── admin.tsx                    # /admin 레이아웃
└── admin/
    ├── index.tsx                # /admin → /admin/feedbacks
    ├── feedbacks.tsx            # /admin/feedbacks?org=xxx
    ├── settings.tsx             # /admin/settings?org=xxx
    └── projects/
        ├── index.tsx            # /admin/projects?org=xxx
        └── $projectId.tsx       # /admin/projects/$projectId?org=xxx
```

### After

```
routes/
├── $orgId/
│   ├── route.tsx                # /{orgId} 레이아웃 (org 검증)
│   ├── admin.tsx                # /{orgId}/admin 레이아웃
│   └── admin/
│       ├── index.tsx            # /{orgId}/admin → feedbacks
│       ├── feedbacks.tsx        # /{orgId}/admin/feedbacks
│       ├── settings.tsx         # /{orgId}/admin/settings
│       └── projects/
│           ├── index.tsx        # /{orgId}/admin/projects
│           └── $projectId.tsx   # /{orgId}/admin/projects/$projectId
├── admin.tsx                    # 레거시 redirect (/admin?org=xxx → /{orgId}/admin)
└── ...
```

## 핵심 구현 패턴

### 1. Org 검증 Layout Route

`$orgId/route.tsx`에서 조직 검증 및 context 제공:

```typescript
export const Route = createFileRoute("/$orgId")({
  beforeLoad: async ({ params }) => {
    const [session, organizations] = await Promise.all([
      getSession(),
      getUserOrganizations(),
    ]);

    if (!session) throw redirect({ to: "/login" });
    if (organizations.length === 0) throw redirect({ to: "/onboarding" });

    const currentOrg = organizations.find((o) => o.id === params.orgId);
    if (!currentOrg) {
      throw redirect({
        to: "/$orgId/admin/feedbacks",
        params: { orgId: organizations[0].id }
      });
    }

    return { session, organizations, currentOrg };
  },
  component: () => <Outlet />,
});
```

### 2. Link/Navigate 패턴 변경

```typescript
// Before
<Link to="/admin/feedbacks" search={{ org: orgId }}>
router.navigate({ to: "/admin/feedbacks", search: { org: orgId } });

// After
<Link to="/$orgId/admin/feedbacks" params={{ orgId }}>
router.navigate({ to: "/$orgId/admin/feedbacks", params: { orgId } });
```

### 3. Context 상속

```typescript
// 하위 라우트에서 context 접근
const { currentOrg } = Route.useRouteContext();
const { orgId } = Route.useParams();
```

## 영향 범위

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `routes/$orgId/route.tsx` | 신규 - org 검증 layout |
| `routes/$orgId/admin.tsx` | 이동 - admin layout |
| `routes/$orgId/admin/index.tsx` | 이동 - redirect |
| `routes/$orgId/admin/feedbacks.tsx` | 이동 - validateSearch에서 org 제거 |
| `routes/$orgId/admin/settings.tsx` | 이동 - validateSearch에서 org 제거 |
| `routes/$orgId/admin/projects/index.tsx` | 이동 - validateSearch에서 org 제거 |
| `routes/$orgId/admin/projects/$projectId.tsx` | 이동 - validateSearch에서 org 제거 |
| `routes/admin.tsx` | 수정 - 레거시 redirect |
| `routes/organizations.tsx` | 수정 - Link params |
| `routes/(auth)/onboarding.tsx` | 수정 - navigate params |

### 삭제 파일

기존 `/admin/*` 라우트 파일 전체 삭제:

- `routes/admin.tsx`
- `routes/admin/index.tsx`
- `routes/admin/feedbacks.tsx`
- `routes/admin/settings.tsx`
- `routes/admin/projects/index.tsx`
- `routes/admin/projects/$projectId.tsx`

## 잘못된 orgId 처리

`/$orgId/route.tsx`에서 `params.orgId`가 사용자의 소속 조직이 아닐 때:

- 첫 번째 조직으로 redirect (사용자가 빠르게 유효한 화면으로 복귀)

---

## Phase 2: Organization Short ID

### 배경

현재 Organization ID는 CUID 유사 형식으로 20-25자 길이다.

```
현재: /c1wr7x7dD9k_vB2cXfGhJ/admin/feedbacks
```

URL이 너무 길어 가독성이 떨어진다. 10자로 줄인다.

```
변경: /V1StGXR8_Z/admin/feedbacks
```

### 변경 범위

- Organization ID만 Short ID 적용
- Project, Feedback 등 다른 엔티티는 현재 형식 유지
- 기존 Organization ID는 유지 (새로 생성되는 것만 Short ID)

### 구현 방식

**nanoid** 라이브러리 사용 (10자, URL-safe)

```typescript
import { nanoid } from "nanoid";

export function generateShortId(): string {
  return nanoid(10);
}
```

### 충돌 안전성

| 항목 | 값 |
|------|-----|
| 문자셋 | A-Za-z0-9_- (64자) |
| 길이 | 10자 |
| 가능한 조합 | 64^10 ≈ 1.15 × 10^18 |
| 1% 충돌까지 | 초당 1000개 생성 시 약 17년 |

PostgreSQL PRIMARY KEY 제약조건이 중복 삽입 방지.

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/database/package.json` | nanoid 의존성 추가 |
| `packages/database/src/client.ts` | `generateShortId()` 함수 추가 |
| `packages/database/src/index.ts` | `generateShortId` export 추가 |
| `packages/database/src/queries/organization.ts` | `createOrganization()`에서 Short ID 사용 |

### 기존 ID와 호환성

| 구분 | 형식 | 길이 | 예시 |
|------|------|------|------|
| 기존 | `c` + timestamp + random | 20-25자 | `c1wr7x7dD9k_vB2cXfGhJ` |
| 신규 | nanoid | 10자 | `V1StGXR8_Z` |

기존 Organization은 그대로 유지, 새로 생성되는 Organization만 Short ID 적용.

---

## 관련 이슈

- sori-pth: URL 구조 검토 (완료)
- sori-21m: org querystring 사용 지점 전수 조사 (완료)
- sori-5q2: TanStack Router layout route 처리 방식 확인 (완료)
- sori-8ez: org 전환 빈도/시나리오 파악 (완료)
- sori-cm7: 라우트 구조 변경 (진행 예정)
- sori-mqd: Link/navigate 수정 (blocked by cm7)
- sori-cxl: 레거시 redirect 설정 (blocked by cm7)

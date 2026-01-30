# 2026-01-30 URL 라우팅 slug 전환

## 배경
- 현재 URL에 org ID가 그대로 노출됨: `/{c1fy5z2ahK9mPqWx}/admin/feedbacks`
- ID가 길고 의미 없는 문자열이라 URL이 지저분함
- DB에 이미 `slug` 필드가 존재 (`TEXT NOT NULL UNIQUE`)
- `getOrganizationBySlug()` 쿼리도 이미 있음

## 구조

```
[URL: /$orgSlug/admin/...]
  → route.tsx beforeLoad: organizations.find(o => o.slug === params.orgSlug)
    → context에 currentOrg 객체 저장
      → server 함수들은 context.currentOrg.id 사용
        → DB 쿼리는 내부 ID로 동작
```

핵심: route loader에서 slug → `currentOrg` 객체로 변환한 뒤, 이후 모든 레이어는 `currentOrg.id`(내부 ID)만 사용. 서버/DB 레이어 변경 없음.

## 변경 범위

### 바꿔야 하는 것 (프론트엔드 라우팅만)

| 파일 | 변경 내용 |
|------|-----------|
| `routes/$orgId/` 폴더명 | `routes/$orgSlug/`로 리네임 |
| `routes/$orgSlug/route.tsx` | `o.id === params.orgId` → `o.slug === params.orgSlug`, redirect fallback도 slug으로 |
| `routes/$orgSlug/admin.tsx` | `useParams()` orgId → orgSlug, 네비게이션 params |
| `routes/$orgSlug/admin/index.tsx` | redirect params |
| `routes/$orgSlug/admin/feedbacks.tsx` | 네비게이션 params |
| `routes/$orgSlug/admin/projects/index.tsx` | Link params |
| `routes/$orgSlug/admin/projects/$projectId.tsx` | 네비게이션 params |
| `routes/organizations.tsx:71` | `orgId: org.id` → `orgSlug: org.slug` |
| `routes/(auth)/onboarding.tsx:69` | `orgId: org.id` → `orgSlug: org.slug` |

### 안 바꿔도 되는 것

| 영역 | 이유 |
|------|------|
| server 함수 (`src/server/*`) | context에서 `currentOrg.id` 사용 |
| DB 쿼리 (`packages/database/*`) | 내부 ID 기반 동작 |
| 인증/권한 (`auth-helpers.ts`) | `requireOrgMembership(organizationId)` — ID 사용 |
| 역할 캐시 (`role-cache.ts`) | 캐시 키 `userId:organizationId` — 변경 불필요 |
| API 라우트 (`routes/api/*`) | orgId 라우트 파라미터 미사용 |

## 리스크

1. **slug 변경 시 기존 URL 깨짐** — 현재 slug 수정 기능 없으므로 당장은 문제 없음. 추후 slug 수정 기능 추가 시 리다이렉트 처리 필요.
2. **기존 URL 호환성** — 사용자가 적으므로 문제 없음. 필요 시 old id URL → slug 리다이렉트 추가 가능.

## 검증 방법

### 1. 빌드 검증
- [x] `pnpm build` — 빌드 에러 없음 확인 완료

### 2. E2E 테스트 (Playwright)

#### TC-01: 로그인 후 URL에 slug 사용 확인
- **전제**: 로그인된 상태
- **동작**: 조직 목록 페이지(`/organizations`)에서 조직 클릭
- **기대**: URL이 `/{slug}/admin` 형태 (예: `/bookcafe/admin`), ID가 아닌 slug

#### TC-02: 탭 네비게이션 — feedbacks
- **전제**: `/{slug}/admin/feedbacks` 페이지
- **동작**: "피드백" 탭 클릭
- **기대**: URL이 `/{slug}/admin/feedbacks`, 페이지 정상 렌더링

#### TC-03: 탭 네비게이션 — projects
- **전제**: `/{slug}/admin/feedbacks` 페이지
- **동작**: "프로젝트" 탭 클릭
- **기대**: URL이 `/{slug}/admin/projects`, 프로젝트 목록 표시

#### TC-04: 탭 네비게이션 — settings
- **전제**: `/{slug}/admin/feedbacks` 페이지
- **동작**: "설정" 탭 클릭
- **기대**: URL이 `/{slug}/admin/settings`, 설정 페이지 표시

#### TC-05: 프로젝트 상세 진입
- **전제**: `/{slug}/admin/projects` 페이지에 프로젝트 1개 이상 존재
- **동작**: "위젯 설정" 링크 클릭
- **기대**: URL이 `/{slug}/admin/projects/{projectId}`, 위젯 설정 페이지 표시

#### TC-06: 프로젝트 상세에서 뒤로가기
- **전제**: `/{slug}/admin/projects/{projectId}` 페이지
- **동작**: 뒤로가기 화살표(←) 클릭
- **기대**: `/{slug}/admin/projects`로 복귀

#### TC-07: 조직 드롭다운 전환
- **전제**: 사용자가 2개 이상 조직에 소속
- **동작**: 헤더의 조직명 클릭 → 다른 조직 선택
- **기대**: URL의 slug이 선택한 조직의 slug으로 변경

#### TC-08: 존재하지 않는 slug 접근
- **전제**: 로그인 상태
- **동작**: 브라우저 주소창에 `/nonexistent-slug/admin/feedbacks` 직접 입력
- **기대**: 사용자의 첫 번째 조직 slug으로 리다이렉트

#### TC-09: 피드백 필터 네비게이션
- **전제**: `/{slug}/admin/feedbacks` 페이지
- **동작**: 필터(상태, 타입 등) 변경
- **기대**: URL의 slug 유지, search params만 변경 (예: `/{slug}/admin/feedbacks?status=OPEN`)

#### TC-10: 온보딩 후 리다이렉트
- **전제**: 로그인 상태, 온보딩 페이지(`/onboarding`)
- **동작**: 새 조직 생성 (이름 + slug 입력)
- **기대**: 생성 후 `/{새slug}/admin`으로 리다이렉트

### 3. 수동 확인 사항
- [x] 서버 함수가 여전히 내부 ID(`currentOrg.id`)를 사용하는지 — 코드 리뷰로 확인 완료
- [x] DB 쿼리에 slug이 직접 전달되지 않는지 — 코드 리뷰로 확인 완료

### 4. 테스트 결과

| TC | 테스트 | 결과 | URL |
|---|---|---|---|
| 01 | 로그인 후 slug URL | PASS | `/logs/admin/feedbacks` |
| 02 | 피드백 탭 | PASS | `/logs/admin/feedbacks` |
| 03 | 프로젝트 탭 | PASS | `/logs/admin/projects` |
| 04 | 설정 탭 | PASS | `/logs/admin/settings` |
| 05 | 프로젝트 상세 진입 | PASS | `/logs/admin/projects/cmjo0oaa...` |
| 06 | 프로젝트 상세 → 뒤로가기 | PASS | `/logs/admin/projects` |
| 07 | 조직 드롭다운 전환 | PASS | `/bookcafe/admin/feedbacks` |
| 08 | 존재하지 않는 slug | PASS | `/nonexistent-slug/...` → `/logs/admin/feedbacks` |
| 09 | 필터 변경 시 slug 유지 | PASS | `/logs/admin/feedbacks?status=OPEN` |
| 10 | 온보딩 후 리다이렉트 | SKIP | 데이터 변경 수반 |

## 결론
- 프론트엔드 라우팅 파일 9개 변경, 서버/DB 레이어 변경 없음
- 빌드 통과 + E2E 9/9 통과 (1 skip)
- URL이 `/{slug}/admin/...` 형태로 변경됨 (예: `/bookcafe/admin/feedbacks`)

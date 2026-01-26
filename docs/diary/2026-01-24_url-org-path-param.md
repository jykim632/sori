# 2026-01-24 URL 구조 변경: org를 querystring에서 path로

## 작업한 내용

org 구분 방식을 querystring에서 path parameter로 변경했다.

```
Before: /admin/feedbacks?org=xxx
After:  /{orgId}/admin/feedbacks
```

### 변경 파일
- `$orgId/route.tsx` 신규 생성 (org 검증 layout)
- `$orgId/admin.tsx` 이동 및 수정
- `$orgId/admin/feedbacks.tsx`, `settings.tsx`, `projects/*` 이동 및 수정
- `organizations.tsx`, `onboarding.tsx` 외부 참조 수정
- 기존 `admin.tsx`, `admin/*` 삭제

## 왜 했는지 (맥락)

기존 querystring 방식의 문제:
- 모든 라우트에서 `validateSearch`로 org 정의 (5곳)
- Link/navigate마다 `search: { org }` 반복 전달 (10곳)
- URL 공유 시 querystring 누락 가능성

path param 방식의 이점:
- layout route에서 org 검증 한 번만 하면 하위 라우트 자동 적용
- `params.orgId`로 어디서든 접근
- URL만 봐도 어느 org인지 명확

## 논의/아이디어/고민

### 탐색 단계 (sori-pth)
1. **org querystring 사용 지점 전수 조사** (sori-21m)
   - validateSearch 5곳, navigate 10곳 확인

2. **TanStack Router layout route 처리 방식** (sori-5q2)
   - 폴더 방식 (`$orgId/`) vs flat naming (`$orgId.admin.tsx`)
   - 폴더 방식 채택 (기존 구조와 유사, 마이그레이션 쉬움)

3. **org 전환 빈도/시나리오** (sori-8ez)
   - 대부분 1개 org만 사용, 전환은 예외적
   - path 변경 UX 부담 거의 없음

### 레거시 redirect 논의
- 처음엔 기존 URL 호환을 위한 redirect 고려
- 아직 개발 중이라 불필요 → 깔끔하게 삭제

## 결정된 내용

| 항목 | 결정 |
|------|------|
| 폴더 구조 | `$orgId/` 폴더 방식 |
| 레거시 redirect | 불필요 (개발 중) |
| 잘못된 orgId | 첫 조직으로 redirect |

## 느낀 점/난이도/발견

**난이도**: 중간
- 파일 이동 + 코드 수정이 많지만 패턴이 반복적
- TanStack Router의 file-based routing 이해 필요

**발견**:
- `Route.useParams()`로 path param 접근
- layout route의 `beforeLoad` context가 하위 라우트로 자동 상속
- `createFileRoute("/$orgId/admin")` 형태로 동적 세그먼트 정의

## 남은 것/미정

- 없음 (전체 구현 완료)

## 다음 액션

- PR 생성 후 머지
- 실제 동작 테스트 (로그인 → org 선택 → 탭 네비게이션)

## beads 이슈

| ID | 제목 | 상태 |
|----|------|------|
| sori-pth | URL 구조 검토 | ✓ 완료 |
| sori-21m | org querystring 사용 지점 전수 조사 | ✓ 완료 |
| sori-5q2 | TanStack Router layout route 처리 방식 확인 | ✓ 완료 |
| sori-8ez | org 전환 빈도/시나리오 파악 | ✓ 완료 |
| sori-cm7 | 라우트 구조 변경 | ✓ 완료 |
| sori-mqd | Link/navigate 수정 | ✓ 완료 (cm7에서 함께) |
| sori-cxl | 레거시 redirect | ✓ 불필요로 닫음 |

---

## 서랍메모

### TanStack Router path param 패턴

```typescript
// route 정의
export const Route = createFileRoute("/$orgId/admin")({
  component: AdminLayout,
});

// param 접근
const { orgId } = Route.useParams();

// Link에서 사용
<Link to="/$orgId/admin/feedbacks" params={{ orgId }}>

// navigate에서 사용
router.navigate({
  to: "/$orgId/admin/feedbacks",
  params: { orgId },
});
```

### Context 상속

```typescript
// 부모 route의 beforeLoad
return { session, organizations, currentOrg };

// 하위 route에서 접근
const { currentOrg } = Route.useRouteContext();
```

---

## 내 질문 평가 및 피드백

**잘한 점:**
- "도메인 vs path" 질문에서 정확히 의도 파악 후 재질문
- 탐색 → 결정 → 구현 단계를 명확히 분리
- beads로 이슈 추적하며 진행

**개선점:**
- 초기 탐색 이슈를 병렬로 더 빨리 처리할 수 있었음
- 문서 작성 시 레거시 호환 부분을 처음부터 "개발 중이면 불필요"로 간소화했으면 좋았음

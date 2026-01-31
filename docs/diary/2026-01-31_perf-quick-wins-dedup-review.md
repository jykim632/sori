# 2026-01-31 성능 Quick Wins + 코드 중복 제거

## 작업한 내용

- **sori-d3p** (성능 Quick Wins)
  - `getFeedbacksFiltered`, `getFeedbacksWithPagination`에서 COUNT + SELECT 이중 쿼리를 `COUNT(*) OVER()` Window 함수 단일 쿼리로 통합
  - 피드백 상태 토글: `router.invalidate()` → 낙관적 업데이트 + 성공 후 백그라운드 `router.invalidate()`
  - 테스트 12건 추가 (window 함수 파싱, 빈 결과, 단일 쿼리 호출, SQL 검증, 페이지 경계)
  - PR #75 생성, base branch `develop` → `main` 충돌 수정

- **sori-exo** (코드 중복 제거)
  - 코드 탐색 결과 3개 항목 모두 이미 해결됨 → close 처리
  - 웹훅 테스트: `sendTestWebhook()` 공용 함수 이미 위임됨
  - URL 검증: `validateUrl()` 이미 존재
  - reply.ts 인증: `getCachedSession()` 이미 사용 중

## 왜 했는지

bd ready에서 P2 이슈 2개 선택. 성능 분석 보고서(2026-01-29)에서 식별된 Quick Wins 적용 + 코드베이스 개선 계획(2026-01-30)의 중복 제거 항목 처리.

## 논의/고민

### 낙관적 업데이트 설계
- 처음엔 `router.invalidate()` 완전 제거 → 리뷰에서 W-1(서버 동기화 누락) 지적
- 해결: 즉시 UI 업데이트(낙관적) + 성공 후 `router.invalidate()`(백그라운드 동기화)
- `useEffect`로 `feedbacks` → `localFeedbacks` 동기화하는 패턴은 React 안티패턴이지만, TanStack Router loader 기반 아키텍처에서 현실적 선택

### 조건부 롤백 제안 검토
- CodeRabbit에서 "롤백 시 현재 상태가 낙관적 값일 때만 복원" 제안
- 시나리오 트레이싱 결과: 더블 토글에서 무조건 롤백과 결과 동일, 트리플 토글에서도 같은 문제 발생
- `router.invalidate()`가 서버 동기화를 처리하므로 복잡도 대비 실익 없음 → 불채택

### Sequential → Parallel 쿼리 (제외)
- feedbacks loader의 3번째 브랜치(projectId 없는 경우) 병렬화하려면 기본값을 "all"로 변경해야 함
- 이건 UX 변경이라 성능 이슈가 아님 → 별도 논의 필요

## 결정된 내용

| 항목 | 결정 | 사유 |
|------|------|------|
| Window 함수 | 채택 | DB 왕복 50% 감소, PostgreSQL 네이티브 지원 |
| 낙관적 + invalidate | 채택 | 체감 속도 향상 + 서버 동기화 보장 |
| 조건부 롤백 | 불채택 | 실질 효과 제한적, 코드 복잡도 증가 |
| Sequential→Parallel | 제외 | UX 변경 필요, 별도 논의 |
| sori-exo | close | 3개 항목 모두 이미 해결됨 |

## 느낀 점/발견

- 이슈 열기 전에 코드 탐색부터 해야 함. sori-exo는 이미 해결된 상태였는데 이슈가 열려 있었음
- `COUNT(*) OVER()`는 빈 페이지(page > totalPages)에서 0을 반환. 별도 COUNT 쿼리와 다른 동작이지만 pagination UI가 처리함
- TanStack Router의 loader 패턴에서 낙관적 업데이트가 깔끔하지 않음. React Query 같은 캐시 레이어가 있으면 더 나은데 현재 아키텍처에선 `useState` + `useEffect` 동기화가 현실적

## 남은 것/미정

- PR #75 수동 검증 항목 2개 (상태 토글 UI 반영, 서버 에러 롤백)
- Sequential → Parallel 쿼리: UX 관점에서 기본 필터를 "all"로 바꿀지 결정 필요
- 에러 롤백 시 toast 알림 없음 (사용자 피드백 부재)

## 다음 액션

- [ ] PR #75 수동 검증 후 머지
- [ ] bd ready에서 다음 이슈 선택

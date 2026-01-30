# TanStack Start 코드베이스 개선 계획

> 작성일: 2026-01-30
> 결정: Next.js 전환 보류, 현재 TanStack Start 스택에서 품질 개선

## 전략 요약

Next.js 마이그레이션 대신 현재 스택의 코드 품질을 높이는 방향으로 결정.
기존 이슈(성능, Rate Limiting, 보안 테스트)와 신규 발견 항목(대형 파일, 중복 코드, 구조)을 통합 정리.

## 우선순위 로드맵

```
P1  sori-g1i   임베드 코드 URL cdn.sori.life 통일     [IN_PROGRESS]
P1  sori-ot3   대형 파일 분리 (컴포넌트/API)            [OPEN]
P2  sori-d3p   성능 Quick Wins 적용                    [OPEN]
P2  sori-exo   코드 중복 제거 (웹훅/인증)               [OPEN]
P2  sori-gbm   Rate Limiting 통합 모듈                 [OPEN]
P2  sori-d3x   테스트 커버리지 확대                     [OPEN] ← depends on sori-gbm
P3  sori-aqt   lib/ 디렉토리 구조 정리                  [OPEN] ← depends on sori-ot3, sori-exo
```

### 의존성 그래프

```
sori-g1i (CDN URL)
    ↓ (독립)
sori-ot3 (파일 분리) ──────┐
    ↓ (독립)               │
sori-d3p (성능)            ├──→ sori-aqt (lib/ 구조 정리)
    ↓ (독립)               │
sori-exo (중복 제거) ──────┘
    ↓ (독립)
sori-gbm (Rate Limit) ───→ sori-d3x (테스트)
```

---

## 1. 대형 파일 분리

> `sori-ot3` · P1

### 대상 파일

| 파일 | 줄 수 | 문제 |
|---|---|---|
| `routes/$orgId/admin/projects/$projectId.tsx` | 1,071 | 위젯 설정, 테마, API 키, 알림이 한 파일 |
| `routes/$orgId/admin/feedbacks.tsx` | 707 | 테이블, 필터, 페이지네이션, 모달 혼재 |
| `routes/api/v1/feedback.ts` | 388 | 레이트리밋, CORS, 검증, 웹훅 혼재 |
| `components/admin/FeedbackDetailModal.tsx` | 371 | 모달 안에서 답글 CRUD 직접 처리 |

### 분리 계획

#### `$projectId.tsx` → 4개 컴포넌트

```
components/projects/
├── ProjectBasicSettings.tsx      # 프로젝트명, 허용 오리진
├── ProjectThemeCustomizer.tsx    # 테마 프리셋, 커스텀 스타일
├── ProjectApiKeyManager.tsx      # API 키 생성/폐기
└── ProjectNotificationSettings.tsx  # 알림 설정
```

`$projectId.tsx`는 이 4개를 임포트하여 탭/섹션으로 조합하는 래퍼로 축소.

#### `feedbacks.tsx` → 3개 컴포넌트

```
components/feedbacks/
├── FeedbacksTable.tsx     # 테이블 렌더링 + 페이지네이션
├── FeedbackFilters.tsx    # 상태/타입/날짜 필터 UI
└── FeedbackActions.tsx    # 상태 변경, 벌크 액션
```

#### `feedback.ts` (API) → 모듈 추출

```
lib/cors.ts                    # isOriginAllowed(), getCorsHeaders()
lib/webhook/sender.ts          # sendWebhookNotification()
lib/api/feedback-validator.ts  # 피드백 입력 검증 로직
```

`feedback.ts` 핸들러는 이 모듈을 조합하는 얇은 레이어로 축소.

#### `FeedbackDetailModal.tsx` → 2개 컴포넌트

```
components/feedbacks/
├── FeedbackDetailModal.tsx   # 모달 쉘 + 피드백 상세 표시
└── FeedbackReplies.tsx       # 답글 목록 + 작성 폼
```

### 검증

- 기존 동작 변경 없음 (순수 리팩토링)
- `pnpm build` 성공
- 각 분리된 컴포넌트가 독립적으로 임포트 가능

---

## 2. 코드 중복 제거

> `sori-exo` · P2

### 2.1 웹훅 테스트 로직 통합

**현재**: `organization.ts`의 `testWebhook()`과 `webhook.ts`의 `testWebhookById()`에 거의 동일한 코드

```
# 추출 대상
lib/webhook/test-webhook.ts

export async function sendTestWebhook(webhookUrl: string, projectName?: string): Promise<{
  success: boolean;
  statusCode?: number;
  error?: string;
}>
```

두 서버 함수에서 이 공통 함수를 호출하도록 변경.

### 2.2 URL 검증 통합

**현재**: `organization.ts`와 `webhook.ts`에 동일한 try-catch URL 파싱 패턴

```
# 추출 대상
lib/validators/url.ts

export function validateWebhookUrl(url: string): { valid: boolean; error?: string }
```

### 2.3 reply.ts 인증 수정

**현재**: `reply.ts`가 `getCachedSession()` 대신 직접 `auth.api.getSession()` 호출 → 캐시 우회

**수정**: `auth-helpers.ts`의 `requireAuth()` 또는 `getCachedSession()` 사용으로 변경

---

## 3. 성능 Quick Wins

> `sori-d3p` · P2 (기존 이슈)

상세: `docs/plans/2026-01-29-performance-analysis.md`

1. **Sequential → Parallel 쿼리**: `feedbacks.tsx`에서 피드백 목록 + 카운트를 직렬 호출 → `Promise.all`
2. **router.invalidate() → 낙관적 업데이트**: 상태 변경 시 전체 새로고침 대신 로컬 상태 업데이트
3. **2중 쿼리 → Window 함수**: `feedback.ts`에서 COUNT(*) + SELECT를 별도 실행 → 단일 쿼리로 통합

---

## 4. 테스트 커버리지 확대

> `sori-d3x` · P2 (기존 이슈, 범위 확장)

depends on: `sori-gbm` (Rate Limiting 통합 완료 후)

### 현재 상태

테스트 파일 2개만 존재 (`lib/api-utils/*.test.ts`). vitest + @testing-library/react 설치돼 있으나 미활용.

### 추가할 테스트

| 테스트 파일 | 대상 | 우선순위 |
|---|---|---|
| `lib/api-auth.test.ts` | `authenticateApiKey` — 유효/무효/만료 키 | 높음 |
| `lib/rate-limiter.test.ts` | 통합 Rate Limiter — 한도, 윈도우, 클린업 | 높음 |
| `lib/cors.test.ts` | origin 매칭 — 와일드카드, 정확한 매치, 거부 | 높음 |
| `server/auth-helpers.test.ts` | `requireOrgMembership`, `requireOrgAdmin` 체인 | 중간 |
| `lib/schemas/server-input.test.ts` | Zod 스키마 edge case (빈 문자열, 초과 길이) | 중간 |
| `routes/api/v1/feedback.test.ts` | 피드백 제출 전체 흐름 (통합 테스트) | 중간 |

### 테스트 방법

- 서버 함수: 외부 의존성(DB, auth) mock 주입
- API 라우트: Request/Response 직접 생성하여 핸들러 호출
- Zod 스키마: 순수 함수 테스트 (mock 불필요)

---

## 5. lib/ 구조 정리

> `sori-aqt` · P3

depends on: `sori-ot3` (파일 분리), `sori-exo` (중복 제거)

### 현재 → 개선

```
현재 (flat):                        개선 (grouped):
src/lib/                            src/lib/
├── api-auth.ts                     ├── api/
├── api-rate-limit.ts               │   ├── auth.ts
├── auth.ts                         │   ├── rate-limit.ts
├── auth-client.ts                  │   ├── feedback-validator.ts
├── db.ts                           │   └── index.ts
├── errors.ts                       ├── auth/
├── role-cache.ts                   │   ├── server.ts        (← auth.ts)
├── session-cache.ts                │   ├── client.ts        (← auth-client.ts)
├── zod-validator.ts                │   └── index.ts
├── api-utils/                      ├── cache/
│   ├── index.ts                    │   ├── session.ts       (← session-cache.ts)
│   ├── rate-limit.ts               │   ├── role.ts          (← role-cache.ts)
│   └── token-validation.ts         │   └── index.ts
├── notification/                   ├── cors.ts              (← 신규, #1에서 추출)
│   └── ...                         ├── validators/
├── schemas/                        │   └── url.ts           (← 신규, #2에서 추출)
│   └── server-input.ts             ├── webhook/
└── webhook/                        │   ├── sender.ts        (← 신규, #1에서 추출)
    └── ...                         │   ├── test-webhook.ts  (← 신규, #2에서 추출)
                                    │   └── ...
                                    ├── notification/
                                    │   └── ...
                                    ├── schemas/
                                    │   └── server-input.ts
                                    ├── db.ts
                                    ├── errors.ts
                                    └── zod-validator.ts
```

### import 경로 변경 규칙

각 그룹 폴더에 `index.ts`를 두어 public API만 노출:

```typescript
// lib/cache/index.ts
export { getCachedSession } from "./session";
export { getCachedRole } from "./role";
```

기존 import 경로를 일괄 교체 (e.g., `@/lib/session-cache` → `@/lib/cache`).

---

## 제외 항목

### Next.js 전환 (보류)

- 이슈 `sori-n1l` 종료 (사유: 현재 스택에서 구체적 문제 없음)
- 마이그레이션 문서 `docs/NEXTJS_MIGRATION.md`는 참고용으로 보관
- 재검토 시점: TanStack Start에서 해결 불가능한 한계 발생 시, 팀 규모 확대 시

---

## 부록: 기타 개선 사항 (이슈 미등록)

아래 항목은 별도 이슈 없이 해당 작업 진행 시 함께 처리:

| 항목 | 관련 작업 |
|---|---|
| Zod 검증 에러 로깅 추가 (`zod-validator.ts`) | 코드 중복 제거(#2) 시 |
| FeedbackDetailModal ESC 키 핸들링 | 대형 파일 분리(#1) 시 |
| FeedbackDetailModal `aria-label` 추가 | 대형 파일 분리(#1) 시 |
| 에러 바운더리 추가 (주요 라우트) | 대형 파일 분리(#1) 시 |
| lazy loading 적용 (프로젝트 설정 하위 컴포넌트) | 대형 파일 분리(#1) 시 |

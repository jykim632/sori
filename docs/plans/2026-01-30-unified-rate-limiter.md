# Rate Limiting 통합 모듈 생성

**이슈**: sori-gbm (P2)
**브랜치**: `refactor/unified-rate-limiter`
**유형**: 순수 리팩토링 — 동작 변경 없음

---

## 현황

5곳에 분산된 rate limiting 코드:

| 위치 | 키 | 제한 | cleanup | 반환 타입 |
|---|---|---|---|---|
| `feedback.ts:10-24` (인라인) | IP | 10 req/min | 5분 | `boolean` |
| `tickets.$token.ts:9-23` (인라인) | IP | 60 req/min | 1분 | `boolean` |
| `tickets.$token.replies.ts:20-34` (인라인) | IP:token | 10 req/min | 1분 | `boolean` |
| `api-rate-limit.ts` (레거시 모듈) | API key | 100 req/min | 1분 | `{ allowed, remaining, resetAt }` |
| `api-utils/rate-limit.ts` (신규 팩토리) | 설정가능 | 설정가능 | 수동 | `{ allowed, remaining, resetTime }` |

`api-utils/rate-limit.ts`의 `createRateLimiter()` 팩토리가 이미 존재하지만 아무 곳에서도 사용되지 않음.

---

## Step 1: `rate-limit.ts` 팩토리 보강

**파일**: `apps/web/src/lib/api-utils/rate-limit.ts`

- `RATE_LIMIT_CONFIGS`에 누락된 설정 추가: `feedbackSubmission`, `apiKey`
- `RateLimitResult.resetTime` → `resetAt`으로 변경 (소비자 4곳이 `resetAt` 사용)
- 테스트 파일(`rate-limit.test.ts`)도 `resetTime` → `resetAt` 반영
- API key limiter 싱글턴 인스턴스 export

## Step 2: 인라인 rate limiter 3곳 교체

- `feedback.ts`: 인라인 코드 → `createRateLimiter(RATE_LIMIT_CONFIGS.feedbackSubmission)`
- `tickets.$token.ts`: 인라인 코드 → `createRateLimiter(RATE_LIMIT_CONFIGS.ticketView)`
- `tickets.$token.replies.ts`: 인라인 코드 → `createRateLimiter(RATE_LIMIT_CONFIGS.ticketReply)`

## Step 3: 레거시 `api-rate-limit.ts` 교체

- 소비자 4곳의 import를 `apiKeyLimiter`로 교체
- `api-rate-limit.ts` 삭제

---

## 수정 파일

| 파일 | 변경 |
|---|---|
| `lib/api-utils/rate-limit.ts` | configs 추가, `resetTime`→`resetAt`, 싱글턴 |
| `lib/api-utils/rate-limit.test.ts` | `resetTime`→`resetAt` |
| `lib/api-utils/index.ts` | `apiKeyLimiter` export 추가 |
| `routes/api/v1/feedback.ts` | 인라인 → `createRateLimiter` |
| `routes/api/v1/tickets.$token.ts` | 인라인 → `createRateLimiter` |
| `routes/api/v1/tickets.$token.replies.ts` | 인라인 → `createRateLimiter` |
| `routes/api/v1/feedbacks.ts` | `checkApiRateLimit` → `apiKeyLimiter.check` |
| `routes/api/v1/feedbacks.$feedbackId.ts` | 동일 |
| `routes/api/v1/feedbacks.$feedbackId.replies.ts` | 동일 |
| `routes/api/v1/feedbacks.$feedbackId.replies.$replyId.ts` | 동일 |
| `lib/api-rate-limit.ts` | **삭제** |

## 커밋 계획

| 순서 | 커밋 메시지 |
|---|---|
| 1 | `refactor: rate-limit 팩토리에 설정 추가 및 필드명 통일` |
| 2 | `refactor: 인라인 rate limiter를 createRateLimiter로 교체` |
| 3 | `refactor: 레거시 api-rate-limit를 통합 모듈로 교체` |

## 검증

- 각 Step 후 `pnpm build` 성공 확인
- 기존 테스트: `pnpm --filter @sori/web test` (rate-limit.test.ts)

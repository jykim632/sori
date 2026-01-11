# PR #60 CodeRabbit 리뷰 정리

> **PR**: chore: develop → main 릴리즈 (Reply 기능 완료)
> **Actionable Comments**: 50개 (11개는 diff 범위 밖)

## 요약

| 분류 | 개수 | 우선순위 | 처리 |
|------|------|----------|------|
| 보안 (Security) | 5 | Critical | ✅ 완료 |
| 버그/오류 (Bug) | 4 | High | 미처리 |
| 코드 품질 (Quality) | 10 | Medium | 미처리 |
| 일관성 (Consistency) | 8 | Low | 미처리 |
| 문서화 (Docs) | 6 | Low | 미처리 |

---

## 1. 보안 (Critical) ✅ 완료

### 1.1 ~~SSRF 취약점 - Webhook URL 검증 우회~~ ✅
**파일**: `apps/web/src/routes/api/v1/feedback.ts:292-315`
**커밋**: `3afa1d0`

~~`isWebhookUrlAllowed` 함수가 allowlist를 무시하고 모든 HTTPS URL을 허용함.~~

```typescript
// 문제: 모든 HTTPS URL 허용
return isAllowedHost || parsed.protocol === "https:";

// 수정: allowlist만 허용
return isAllowedHost;
```

### 1.2 ~~Admin CORS 실패~~ (해당 없음)
**파일**: `apps/web/src/lib/api-auth.ts:68-74`

~~`ALLOWED_ADMIN_ORIGINS`에 `app.sori.life` 누락 → Admin API 호출 실패.~~

> **참고**: `app.sori.life` 도메인은 사용하지 않음. `web.sori.life`가 유일한 도메인.

### 1.3 ~~Widget XSS 취약점~~ ✅
**파일**: `packages/core/src/widget.ts:114-140`
**커밋**: `3afa1d0`

~~`config.greeting`이 `innerHTML`에 직접 삽입됨 → XSS 가능.~~

```typescript
// 수정: escapeHtml 적용
${escapeHtml(config.greeting)}
```

### 1.4 ~~Email Header Injection~~ ✅
**파일**: `apps/web/src/lib/notification/email/customer.ts`
**커밋**: `e5aaa58`

~~From 헤더에 프로젝트 이름 삽입 시 CRLF 미검증 → Header Injection 가능.~~

```typescript
// 수정: CRLF 제거
const sanitizedName = context.project.name.replace(/[\r\n]/g, '').trim();
```

### 1.5 ~~Webhook 권한 검증 누락~~ ✅
**파일**: `apps/web/src/server/webhook.ts`
**커밋**: `87b7833`

~~`getWebhooks`, `deleteWebhook`, `createWebhook`, `updateWebhook`, `testWebhookById`에 조직 권한 검증 없음.~~

모든 webhook 함수에 `requireOrgMembership` 검증 추가 완료.

---

## 2. 버그/오류 (High)

### 2.1 Widget Email 불일치
**파일**: `apps/cdn/src/widget.ts:11-16`

- UI: Email이 Optional로 표시
- API: Email 필수 (없으면 400 에러)

수정: UI에서 Email을 필수로 변경하거나 API에서 optional로 변경.

### 2.2 Promise.all로 인한 Redirect 실패
**파일**: `apps/web/src/routes/admin.tsx:18-35`

```typescript
// 문제: getUserOrganizations가 먼저 throw → redirect 안 됨
const [session, organizations] = await Promise.all([
  getSession(),
  getUserOrganizations(),
]);

// 수정: 순차 실행
const session = await getSession();
if (!session) throw redirect({ to: "/login" });
const organizations = await getUserOrganizations();
```

### 2.3 AuthorType 라벨 불일치
**파일**: `packages/database/src/schemas/enums.ts:34-39`

`getAuthorTypeLabel`에서 "USER" case만 있고 "CUSTOMER" 처리 누락.

### 2.4 날짜 계산 버그 (setMonth overflow)
**파일**: `packages/database/src/queries/feedback.ts:527-533`

`setMonth`가 월말 경계에서 overflow 발생 (예: 8/31 + 6개월 → 3월로 잘못 계산).

수정: `date-fns`의 `addMonths` 사용 권장.

---

## 3. 코드 품질 (Medium)

> CLAUDE.md 가이드라인: 함수는 20줄 이내로 유지

### 3.1 함수 길이 초과

| 파일 | 함수 | 현재 | 권장 |
|------|------|------|------|
| `apps/web/src/server/reply.ts` | `createReply` | ~40줄 | 이메일 알림 로직 분리 |
| `apps/web/src/components/.../index.tsx` | `handleSave` | ~43줄 | 검증 로직 분리 |
| `packages/core/src/widget.ts` | `handleSubmit` | ~90줄 | 검증 함수 분리 |
| `apps/web/src/routes/api/v1/tickets.$token.replies.ts` | `sendAdminNotification` | ~80줄 | payload 빌더 분리 |
| `apps/web/src/lib/notification/email/customer-template.ts` | `generateCustomerReplyEmailHtml` | ~80줄 | 섹션별 렌더러 분리 |
| `apps/web/src/routes/f/$token.tsx` | `handleSubmitReply` | ~50줄 | 상태 업데이트 분리 |
| `apps/web/src/routes/f/$token.tsx` | `TicketPage` | ~200줄 | 커스텀 훅 & 컴포넌트 분리 |

### 3.2 React에서 불필요한 escapeHtml
**파일**: `apps/web/src/routes/f/$token.tsx:189, 320-330`

React JSX는 자동으로 escape 처리함. `escapeHtml()` 호출 제거 필요.

### 3.3 generateId 에러 핸들링
**파일**: `packages/database/src/client.ts:81-86`

`crypto.randomBytes`가 시스템 실패 시 throw 가능 → try/catch 추가 권장.

---

## 4. 일관성/표준화 (Low)

### 4.1 Zod 사용 권장

| 파일 | 현재 | 권장 |
|------|------|------|
| `api-utils/token-validation.ts` | 수동 UUID regex | `z.string().uuid()` |
| `packages/core/src/validation.ts` | 수동 email regex | `z.string().email()` |
| `tickets.$token.ts` | 수동 content 검증 | Zod schema |
| `server-input.ts` | 문자열 에러 메시지 | Zod v4 `{ error: "" }` 형식 |

### 4.2 중복 코드 제거

| 위치 | 내용 | 공유 유틸리티 |
|------|------|---------------|
| `tickets.$token.ts` | UUID_REGEX | `isValidUUID` from `api-utils` |
| `tickets.$token.ts` | 인메모리 rate limiter | `createRateLimiter` from `api-utils` |

### 4.3 Import 확장자 제거
**파일**: `apps/web/src/lib/api-utils/index.ts`

```typescript
// 현재
export * from "./token-validation.ts";

// 권장
export * from "./token-validation";
```

### 4.4 DB 쿼리 중복 호출
**파일**: `apps/web/src/routes/api/v1/tickets.$token.ts:86-124`

`getFeedbackByToken` → `getFeedbackWithRepliesByToken` 순차 호출 → 1개 쿼리로 통합 권장.

### 4.5 Reply content 길이 불일치
- `CreateReplySchema`: 10000자
- `tickets.$token.replies.ts`: 5000자

통일 필요.

---

## 5. 기타 제안

### 5.1 Preload 전략
**파일**: `apps/web/src/routes/admin.tsx:130-168`

`preload="viewport"` → `preload="intent"` 변경 권장 (모바일 성능).

### 5.2 로깅 개선
**파일**: `apps/web/src/lib/notification/slack/index.ts:21`

`console.log` → 구조화된 logger (pino/winston) 사용 권장.

### 5.3 환경변수 문서화
**파일**: `apps/web/src/server/reply.ts:55-56`

`APP_URL`을 `.env.example`에 추가하고 환경별 값 문서화.

### 5.4 Vitest 환경 설정
**파일**: `packages/database/vitest.config.ts`

`environment: "node"` 명시 권장.

### 5.5 Email 정규화
**파일**: `apps/web/src/lib/schemas/server-input.ts:188-197`

중복 체크 전 lowercase + trim 적용 권장.

### 5.6 withTransaction 헬퍼 개선
**파일**: `packages/database/src/client.ts:63-79`

`queryWithClient`, `queryOneWithClient` 등 타입 안전한 헬퍼 추가 권장.

---

## 6. 문서화 이슈

마크다운 린트 위반 (MD022, MD031, MD040):
- `docs/2026-01-07.md`
- `docs/feedback/2026-01-10-pm-feedback.md`
- `docs/feedback/backend-feedback.md`
- `docs/feedback/frontend-review.md`
- `docs/feedback/security-feedback.md`
- `docs/reviews/pr-51-coderabbit-review.md`

주요 수정사항:
- 코드 블록에 언어 지정자 추가 (```typescript, ```bash 등)
- 코드 블록 전후 빈 줄 추가
- 헤딩 전후 빈 줄 추가

---

## 조치 우선순위

### P0 (즉시 수정) ✅ 완료
1. ~~SSRF 취약점 수정~~ ✅ `3afa1d0`
2. ~~Admin CORS 추가~~ ⏭️ 해당없음
3. ~~Widget XSS 수정~~ ✅ `3afa1d0`

### P1 (릴리즈 전) ✅ 완료
4. ~~Email Header Injection 방지~~ ✅ `e5aaa58`
5. ~~Webhook 권한 검증 추가~~ ✅ `87b7833`
6. Widget Email 필수화 (이미 처리됨 - PR #59)
7. Promise.all → 순차 실행

### P2 (다음 스프린트)
8. AuthorType 라벨 수정
9. 날짜 계산 버그 수정
10. 함수 리팩토링

### P3 (백로그)
- Zod 통합
- 코드 일관성 개선
- 문서 린트 수정

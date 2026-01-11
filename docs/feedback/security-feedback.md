# Sori Security Review

**리뷰어**: Senior Security Engineer
**리뷰 일자**: 2026-01-10
**대상 버전**: develop branch (commit 049ac77)

---

## 요약

전반적으로 보안의 기본 원칙들이 잘 적용되어 있습니다. SQL Injection 방지, Rate Limiting, 입력 검증 등 핵심 보안 기능이 구현되어 있습니다. 그러나 몇 가지 **중요한 취약점**과 **개선이 필요한 영역**이 발견되었습니다.

### 위험도 분류
- **Critical**: 즉시 수정 필요
- **High**: 빠른 시일 내 수정 권장
- **Medium**: 개선 권장
- **Low**: 참고사항

---

## Critical Issues (즉시 수정 필요)

### 1. SSRF (Server-Side Request Forgery) 취약점

**위치**:
- `apps/web/src/server/organization.ts:135-143` (`testWebhook`)
- `apps/web/src/server/webhook.ts:122-128` (`testWebhookById`)

**문제점**:
```typescript
// organization.ts - testWebhook
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", "User-Agent": "Sori-Webhook/1.0" },
  body: JSON.stringify(testPayload),
});
```

사용자가 제공한 `webhookUrl`로 직접 서버에서 HTTP 요청을 보냅니다. 공격자가 내부 네트워크 주소(예: `http://169.254.169.254/`, `http://localhost:6379/`)를 입력하면:
- AWS/GCP 메타데이터 서비스 접근
- 내부 서비스(Redis, DB) 접근
- 포트 스캔 가능

**참고**: `apps/web/src/routes/api/v1/feedback.ts`에는 이미 SSRF 방지 로직이 있습니다(`isWebhookUrlAllowed`). 동일한 로직을 적용해야 합니다.

**권장 조치**:
```typescript
// 공통 유틸리티로 분리하여 모든 외부 URL fetch에 적용
import { isWebhookUrlAllowed } from "@/lib/webhook-security";

if (!isWebhookUrlAllowed(webhookUrl)) {
  throw new AppError("VAL_INVALID_WEBHOOK_URL");
}
```

---

### 2. 권한 검증 누락

**위치**:
- `apps/web/src/server/webhook.ts:32-36` (`getWebhooks`)
- `apps/web/src/server/webhook.ts:90-95` (`deleteWebhook`)

**문제점**:
```typescript
// getWebhooks - 조직 멤버십 확인 없음
export const getWebhooks = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetWebhooksInputSchema))
  .handler(async ({ data }) => {
    return await getWebhooksQuery(data.organizationId);  // 바로 조회
  });

// deleteWebhook - 조직 멤버십 확인 없음
export const deleteWebhook = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(DeleteWebhookInputSchema))
  .handler(async ({ data }) => {
    await deleteWebhookQuery(data.id);  // 바로 삭제
    return { success: true };
  });
```

인증된 사용자가 다른 조직의 webhook을 조회하거나 삭제할 수 있습니다.

**권장 조치**:
```typescript
export const getWebhooks = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetWebhooksInputSchema))
  .handler(async ({ data }) => {
    await requireOrgMembership(data.organizationId);  // 추가
    return await getWebhooksQuery(data.organizationId);
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(DeleteWebhookInputSchema))
  .handler(async ({ data }) => {
    // webhook 조회 후 소속 조직의 멤버십 확인
    const webhook = await getWebhookById(data.id);
    if (!webhook) throw new AppError("RES_WEBHOOK_NOT_FOUND");
    await requireOrgAdmin(webhook.organizationId);  // 삭제는 관리자만

    await deleteWebhookQuery(data.id);
    return { success: true };
  });
```

---

## High Priority Issues

### 3. XSS (Cross-Site Scripting) 취약점

**위치**: `packages/core/src/widget.ts:76`

**문제점**:
```typescript
container.innerHTML = `
  <div class="sori-panel">
    <div class="sori-header">
      <div class="sori-greeting">${config.greeting}</div>  // XSS 가능
```

`config.greeting`이 서버에서 설정된 `widgetConfig`에서 올 경우, 악의적인 조직 관리자가 XSS 페이로드를 삽입할 수 있습니다.

**참고**: CDN 위젯(`apps/cdn/src/widget.ts`)에는 `escapeHtml` 함수가 있지만 적용되지 않은 곳이 있습니다.

**권장 조치**:
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// greeting 렌더링 시
<div class="sori-greeting">${escapeHtml(config.greeting)}</div>
```

---

### 4. 이메일 템플릿 HTML Injection

**위치**: `apps/web/src/lib/auth.ts:91-92`

**문제점**:
```typescript
sendVerificationEmail: async ({ user, url }) => {
  // ...
  html: `
    <h2>이메일 인증</h2>
    <p>안녕하세요, ${user.name || "고객"}님!</p>  // 사용자 이름 직접 삽입
```

사용자가 회원가입 시 이름에 HTML/JavaScript 코드를 입력하면:
- 이메일 클라이언트에서 실행될 수 있음
- 피싱 링크 삽입 가능

**권장 조치**:
- 사용자 이름 입력 시 특수문자 필터링
- 이메일 렌더링 시 HTML 이스케이프 적용

---

### 5. API Key 노출 위험

**위치**: `packages/database/src/queries/project.ts:38-39`

**문제점**:
```typescript
export async function getProjectById(id: string): Promise<ProjectWithOrganization | null> {
  const sql = `
    SELECT
      p.id, p.name, p.allowed_origins as "allowedOrigins",
      p.widget_config as "widgetConfig", p.organization_id as "organizationId",
      p.api_key as "apiKey", p.api_key_created_at as "apiKeyCreatedAt",  // API Key 포함
```

클라이언트에 반환되는 프로젝트 정보에 API Key가 포함됩니다.

**권장 조치**:
- 별도의 함수로 분리 (`getProjectByIdWithApiKey` - 관리자 전용)
- 클라이언트 응답에서 `apiKey` 필드 제외

---

## Medium Priority Issues

### 6. In-Memory Rate Limiting 한계

**위치**:
- `apps/web/src/routes/api/v1/feedback.ts:11-24`
- `apps/web/src/lib/api-rate-limit.ts`

**문제점**:
- 서버 재시작 시 rate limit 상태 초기화
- 멀티 인스턴스(수평 확장) 환경에서 각 인스턴스별로 독립적 카운팅
- 공격자가 인스턴스별로 rate limit 우회 가능

**권장 조치**:
- Redis 기반 rate limiting 고려 (프로덕션 환경)
- 현재 단일 인스턴스라면 문제없음 (문서화 필요)

---

### 7. Timing Attack 가능성

**위치**: `apps/web/src/lib/api-auth.ts:51`

**문제점**:
```typescript
const project = await getProjectByApiKey(apiKey);
if (!project) {
  return { success: false, error: "Invalid API key", status: 401 };
}
```

API 키 검증 시 일반 문자열 비교 사용. 응답 시간 차이로 유효한 API 키 추측 가능.

**권장 조치**:
```typescript
import { timingSafeEqual } from 'crypto';

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
```

현실적 위험도는 낮지만, 보안 모범 사례로 적용 권장.

---

### 8. 세션 만료 정책 미명시

**위치**: `apps/web/src/lib/auth.ts`

**문제점**:
better-auth 설정에 세션 만료 시간이 명시되어 있지 않습니다. 기본값에 의존하고 있으며, 이는 보안 감사 시 문제가 될 수 있습니다.

**권장 조치**:
```typescript
export const auth = betterAuth({
  // ...
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7일 (명시적 설정)
    updateAge: 60 * 60 * 24,      // 1일마다 갱신
    // ...
  },
});
```

---

### 9. Order By SQL Injection 잠재적 위험

**위치**: `packages/database/src/queries/feedback.ts:193`

**문제점**:
```typescript
const orderColumn = orderBy === "updatedAt" ? "updated_at" : "created_at";
// ...
ORDER BY ${orderColumn} ${order.toUpperCase()}
```

TypeScript 타입으로 제한하고 있지만, 런타임 검증이 없습니다.

**권장 조치**:
- 현재 구현은 허용 목록 기반이라 안전하지만, 명시적 검증 추가 권장:
```typescript
const ALLOWED_ORDER_COLUMNS = ["created_at", "updated_at"] as const;
const ALLOWED_ORDERS = ["ASC", "DESC"] as const;

if (!ALLOWED_ORDER_COLUMNS.includes(orderColumn)) {
  throw new Error("Invalid order column");
}
```

---

## Low Priority Issues (참고사항)

### 10. Metadata 개인정보 저장

**위치**: `packages/core/src/api.ts:19-24`

```typescript
metadata: {
  url: window.location.href,
  userAgent: navigator.userAgent,
  locale: navigator.language,
  timestamp: new Date().toISOString(),
  ...payload.metadata,
}
```

userAgent, 현재 URL 등이 저장됩니다. GDPR 등 개인정보 규정 준수 시 고려 필요.

**권장 조치**:
- 개인정보 처리방침에 수집 항목 명시
- 필요시 민감 정보 해싱 또는 익명화

---

### 11. 환경 변수 보안 가이드라인

**위치**: `apps/web/.env.example`

```
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
```

**권장 조치**:
- 최소 64자 이상의 랜덤 문자열 권장
- 생성 방법 안내 추가:
```bash
# 권장 생성 방법
openssl rand -base64 48
```

---

### 12. 에러 메시지 정보 노출

**위치**: 여러 곳

```typescript
console.error("Feedback submission error:", error);
```

프로덕션 환경에서 상세 에러 로그가 노출될 수 있습니다.

**권장 조치**:
- 구조화된 로깅 (winston, pino 등) 도입
- 프로덕션 환경에서 스택 트레이스 숨김

---

## 잘 구현된 보안 기능

다음 항목들은 보안 모범 사례를 잘 따르고 있습니다:

1. **SQL Injection 방지**
   - 모든 쿼리에서 파라미터화된 쿼리 사용 (`$1`, `$2`)
   - 사용자 입력이 SQL에 직접 삽입되지 않음

2. **입력 검증**
   - Zod 스키마를 통한 체계적인 입력 검증
   - 서버 함수에 `inputValidator` 일관 적용

3. **인증/인가 구조**
   - 권한 검증 헬퍼 함수들 (`requireOrgMembership`, `requireProjectAccess` 등)
   - 세션 기반 인증 (better-auth)

4. **CORS 설정**
   - 동적 Origin 검증
   - 와일드카드 도메인 지원 (`*.example.com`)

5. **피드백 API SSRF 방지**
   - `apps/web/src/routes/api/v1/feedback.ts`의 webhook URL 검증
   - 내부 네트워크 IP 차단

6. **이메일 인증 필수**
   - `requireEmailVerification: true`

7. **환경 변수 관리**
   - `.gitignore`에서 `.env*` 파일 제외

8. **CDN 위젯 XSS 방지**
   - `escapeHtml` 함수로 에러 메시지 이스케이프

---

## 권장 조치 우선순위

| 순위 | 이슈 | 위험도 | 예상 작업량 |
|------|------|--------|-------------|
| 1 | SSRF 취약점 (testWebhook) | Critical | 낮음 |
| 2 | 권한 검증 누락 (webhook) | Critical | 낮음 |
| 3 | Widget XSS 취약점 | High | 낮음 |
| 4 | 이메일 HTML Injection | High | 낮음 |
| 5 | API Key 노출 | High | 중간 |
| 6 | Redis Rate Limiting | Medium | 높음 |
| 7 | Timing Attack 방지 | Medium | 낮음 |
| 8 | 세션 만료 정책 | Medium | 낮음 |

---

## 추가 권장 사항

1. **보안 헤더 추가**
   - Content-Security-Policy (CSP)
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Strict-Transport-Security (HSTS)

2. **의존성 보안 스캔**
   - `pnpm audit` 정기 실행
   - Dependabot/Snyk 연동

3. **보안 로깅 및 모니터링**
   - 실패한 인증 시도 로깅
   - 비정상 패턴 감지

4. **정기 보안 검토**
   - 분기별 코드 보안 리뷰
   - 침투 테스트 고려

---

## 결론

Sori 프로젝트는 기본적인 보안 원칙을 잘 따르고 있습니다. 특히 SQL Injection 방지와 입력 검증이 체계적으로 구현되어 있습니다.

**즉시 조치가 필요한 항목**:
1. testWebhook SSRF 취약점 (공통 URL 검증 유틸리티 적용)
2. webhook 관련 권한 검증 추가

이 두 가지 Critical 이슈를 우선 수정하고, 이후 High 이슈들을 순차적으로 해결하시기 바랍니다.

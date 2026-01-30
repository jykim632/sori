# [P1] 이메일 알림 활성화 시 빈 수신자 검증 누락 (fix/email-empty-recipients-validation)

## 버그 요약

이메일 알림을 활성화(`emailEnabled: true`)하면서 수신자 목록을 비워둔 채 저장할 수 있었음. DB에 `emailEnabled: true, emailRecipients: []`로 저장되어 알림이 발송되지 않지만 사용자는 알림이 설정된 것으로 인지.

## 영향 범위

- **사용자 영향**: 알림이 활성화되었다고 믿지만 실제로는 발송되지 않음 (silent failure)
- **데이터 영향**: `emailEnabled: true, emailRecipients: []` 비정합 데이터 존재 가능
- **보안 영향**: 없음

## 원인 분석

### 검증 레이어별 상태 (수정 전)

| 레이어 | 파일 | 빈 수신자 검증 | 상태 |
|--------|------|---------------|------|
| 프론트엔드 | `components/projects/notification-settings/index.tsx:93-114` | 이메일 형식, 최대 10명만 검증 | ❌ 누락 |
| Zod 스키마 | `lib/schemas/server-input.ts:188-215` | 개별 필드 검증만 (email format, max) | ❌ 누락 |
| 서버 함수 | `server/project-notification.ts:28-39` | Zod 스키마에 위임 | ✅ (스키마 의존) |
| DB 쿼리 | `database/queries/project-notification.ts:34-71` | UPSERT, 제약 조건 없음 | ✅ (상위 레이어 의존) |

**핵심 원인**: `emailEnabled`와 `emailRecipients` 간의 **교차 필드 검증(cross-field validation)**이 프론트엔드와 Zod 스키마 양쪽 모두에서 누락됨.

Slack은 이미 검증이 있었음 (`slackEnabled && !slackWebhookUrl` → 에러), 이메일만 빠져 있었음.

### 프론트엔드 검증 코드 (수정 전)

```typescript
// notification-settings/index.tsx handleSave()
const handleSave = async () => {
  const { valid: validEmails, errors } = validateEmails(emailRecipients);

  if (emailEnabled && errors.length > 0) {        // ✅ 형식 검증
    setError("유효하지 않은 이메일 주소가 있습니다");
    return;
  }
  if (emailEnabled && validEmails.length > 10) {   // ✅ 최대 개수
    setError("이메일 수신자는 최대 10명까지 가능합니다");
    return;
  }
  // ❌ 빈 수신자 검증 없음 — emailEnabled=true, emailRecipients=[] 통과

  if (slackEnabled && !slackWebhookUrl) {          // ✅ Slack은 검증 있음
    setError("Slack 알림을 활성화하려면 Webhook URL을 입력해주세요");
    return;
  }
};
```

### Zod 스키마 (수정 전)

```typescript
// server-input.ts
export const UpdateNotificationSettingInputSchema = z.object({
  projectId: z.string(),
  emailEnabled: z.boolean(),
  emailRecipients: z.array(z.string().email()).max(10),  // ✅ 형식, 최대 개수
  slackEnabled: z.boolean(),
  slackWebhookUrl: z.string().url().nullable(),
});
// ❌ superRefine 없음 — emailEnabled=true + emailRecipients=[] 통과
```

## 해결 방안

### Fix 1: 프론트엔드 빈 수신자 검증 추가

- **파일**: `apps/web/src/components/projects/notification-settings/index.tsx`
- **위치**: `handleSave()` 함수, 최대 개수 검증 뒤
- **변경 내용**:

```typescript
// 추가된 검증
if (emailEnabled && validEmails.length === 0) {
  setError("이메일 알림을 활성화하려면 최소 1명의 수신자를 입력해주세요");
  return;
}
```

### Fix 2: Zod 스키마 교차 필드 검증 추가

- **파일**: `apps/web/src/lib/schemas/server-input.ts`
- **위치**: `UpdateNotificationSettingInputSchema`, `.object()` 뒤에 `.superRefine()` 체이닝
- **변경 내용**:

```typescript
.superRefine((data, ctx) => {
  if (data.emailEnabled && data.emailRecipients.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "이메일 알림을 활성화하려면 최소 1명의 수신자가 필요합니다",
      path: ["emailRecipients"],
    });
  }
  if (data.slackEnabled && !data.slackWebhookUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Slack 알림을 활성화하려면 Webhook URL이 필요합니다",
      path: ["slackWebhookUrl"],
    });
  }
});
```

## 수정 순서

1. Zod 스키마에 `.superRefine()` 추가 (서버 방어)
2. 프론트엔드 `handleSave()`에 빈 수신자 검증 추가 (UX)
3. 테스트 작성 (notification-setting.test.ts)
4. 기존 비정합 데이터 보정 쿼리 실행

## 테스트 케이스

**핵심 수정**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| C-1 | emailEnabled: true, emailRecipients: [] | 저장 | 에러: "최소 1명의 수신자 필요" |

**회귀 방지**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| R-1 | emailEnabled: true, emailRecipients: ["a@b.com"] | 저장 | 성공 |
| R-2 | emailEnabled: false, emailRecipients: [] | 저장 | 성공 (비활성 상태) |
| R-3 | slackEnabled: true, slackWebhookUrl: valid | 저장 | 성공 |
| R-4 | emailEnabled: true, recipients: 10명 | 저장 | 성공 (최대치) |

**경계값**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| E-1 | emailEnabled: true, recipients: 11명 | 저장 | 에러: "최대 10명" |
| E-2 | emailRecipients: ["invalid-email"] | 저장 | 에러: "유효한 이메일" |
| E-3 | emailRecipients: ["a@b.com", "a@b.com"] | 저장 | 에러: "중복된 이메일" |

**서버 검증**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| S-1 | API 직접 호출, emailEnabled: true, recipients: [] | POST | Zod 검증 에러 |
| S-2 | API 직접 호출, slackEnabled: true, url: null | POST | Zod 검증 에러 |

**데이터 정합성**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| D-1 | DB에 emailEnabled=true, recipients=[] 존재 | 보정 쿼리 실행 | emailEnabled=false로 변경 |
| D-2 | 보정 후 해당 설정 페이지 로드 | 페이지 접근 | 이메일 비활성 상태 표시 |

## 관련 파일

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/components/projects/notification-settings/index.tsx` | handleSave()에 빈 수신자 검증 추가 |
| `apps/web/src/lib/schemas/server-input.ts` | superRefine으로 교차 필드 검증 추가 |
| `apps/web/src/lib/schemas/notification-setting.test.ts` | 14개 테스트 케이스 추가 |

## 교훈

- **교차 필드 검증 패턴**: `field A enabled → field B required` 관계는 반드시 `superRefine()`으로 검증
- **이중 방어**: 프론트엔드 + Zod 스키마 양쪽에서 동일 검증 적용 (Defense in Depth)
- **일관성 점검**: Slack에 있는 검증이 Email에 없는 비대칭은 코드 리뷰에서 잡아야 함

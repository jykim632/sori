# [P0] 이메일 알림 빈 수신자 검증 누락 (GH#56 / sori-xdt)

## 버그 요약

이메일 알림을 활성화한 상태에서 수신자 없이 저장하면 검증 없이 `emailRecipients: []`로 저장됨.

## 영향 범위

- **사용자 영향**: 이메일 알림 ON인데 수신자가 없어 알림이 영원히 발송되지 않음. 사용자는 알림이 동작한다고 착각할 수 있음.
- **데이터 영향**: DB에 `emailEnabled: true, emailRecipients: []` 비정합 상태 저장
- **보안 영향**: 없음

## 원인 분석

**2개 레이어 모두에서 검증 누락.**

### 1. 컴포넌트 레이어 (프론트엔드)

`notification-settings/index.tsx:93-114` `handleSave` 함수:

```typescript
// ✅ 이메일 형식 오류 검증 있음
if (emailEnabled && errors.length > 0) { ... }

// ✅ 최대 수신자 수 검증 있음
if (emailEnabled && validEmails.length > 10) { ... }

// ❌ 빈 수신자 검증 없음!
// if (emailEnabled && validEmails.length === 0) { ... }

// ✅ Slack은 빈 URL 검증 있음
if (slackEnabled && !slackWebhookUrl) { ... }
```

Slack은 빈 값 검증이 있지만, 이메일은 빈 배열 검증이 빠져있음.

### 2. 스키마 레이어 (서버)

`lib/schemas/server-input.ts:188-214` `UpdateNotificationSettingInputSchema`:

```typescript
emailRecipients: z
  .array(z.string().email())
  .max(10)
  .refine(/* 중복 체크 */);
// ❌ emailEnabled === true일 때 .min(1) 검증 없음
// ❌ emailEnabled와 emailRecipients 간 교차 검증 없음
```

스키마에서 `emailEnabled`와 `emailRecipients` 간 **조건부 검증**이 없어서, 서버 사이드에서도 빈 배열이 통과됨.

## 해결 방안

### Fix 1: 컴포넌트 검증 추가 (즉시 효과)

**파일**: `apps/web/src/components/projects/notification-settings/index.tsx`
**위치**: `handleSave` 함수, 기존 이메일 검증 블록 뒤 (line 104 이후)

```typescript
// 기존 코드 뒤에 추가
if (emailEnabled && validEmails.length === 0) {
  setError("이메일 알림을 활성화하려면 최소 1명의 수신자를 입력해주세요");
  return;
}
```

### Fix 2: Zod 스키마 교차 검증 추가 (서버 방어)

**파일**: `apps/web/src/lib/schemas/server-input.ts`
**변경**: `UpdateNotificationSettingInputSchema`에 `.superRefine()` 추가

```typescript
export const UpdateNotificationSettingInputSchema = z
  .object({
    projectId: z.string(),
    emailEnabled: z.boolean(),
    emailRecipients: z
      .array(z.string().email("유효한 이메일 주소를 입력해주세요"))
      .max(10, "이메일 수신자는 최대 10명까지 가능합니다")
      .refine(
        (emails) => new Set(emails).size === emails.length,
        "중복된 이메일 주소가 있습니다"
      ),
    slackEnabled: z.boolean(),
    slackWebhookUrl: z
      .string()
      .url("유효한 URL을 입력해주세요")
      .refine(
        (url) => {
          try {
            const parsed = new URL(url);
            return parsed.hostname === "hooks.slack.com";
          } catch {
            return false;
          }
        },
        "Slack Webhook URL만 허용됩니다 (https://hooks.slack.com/...)"
      )
      .nullable(),
  })
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

> Slack도 현재 컴포넌트에서만 검증하고 스키마에는 교차 검증이 없으므로, 같이 추가하는 것이 일관성 있음.

## 수정 순서

1. **Fix 1** - 컴포넌트 `handleSave`에 빈 수신자 검증 추가
2. **Fix 2** - Zod 스키마에 `.superRefine()` 교차 검증 추가
3. 기존 DB에 `emailEnabled: true, emailRecipients: []` 상태 데이터가 있는지 확인 (있으면 emailEnabled를 false로 보정)

## 테스트 케이스

### TC1: 이메일 빈 수신자 차단 (핵심 - 이번 버그)

| # | 조건 | 조작 | 기대 결과 |
|---|---|---|---|
| 1-1 | 이메일 ON, 수신자 입력 없음 | 저장 클릭 | 에러: "최소 1명의 수신자를 입력해주세요", 저장 차단 |
| 1-2 | 이메일 ON, 공백/빈줄만 입력 | 저장 클릭 | 에러: "최소 1명의 수신자를 입력해주세요", 저장 차단 |
| 1-3 | 이메일 ON → 수신자 입력 → 전부 삭제 | 저장 클릭 | 에러: "최소 1명의 수신자를 입력해주세요", 저장 차단 |

### TC2: 이메일 정상 동작 (회귀 방지)

| # | 조건 | 조작 | 기대 결과 |
|---|---|---|---|
| 2-1 | 이메일 ON, 유효 수신자 1명 | 저장 클릭 | 정상 저장, "저장됨" 표시 |
| 2-2 | 이메일 ON, 유효 수신자 10명 | 저장 클릭 | 정상 저장 |
| 2-3 | 이메일 ON, 유효 수신자 11명 | 저장 클릭 | 에러: "최대 10명", 저장 차단 |
| 2-4 | 이메일 ON, 잘못된 형식 포함 | 저장 클릭 | 에러: "유효하지 않은 이메일", 저장 차단 |
| 2-5 | 이메일 ON, 중복 이메일 포함 | 저장 클릭 | 스키마에서 "중복된 이메일" 에러 |
| 2-6 | 이메일 OFF, 수신자 0명 | 저장 클릭 | 정상 저장 (비활성 상태는 수신자 불필요) |
| 2-7 | 이메일 OFF, 수신자 있음 | 저장 클릭 | 정상 저장 (비활성이지만 수신자 유지) |

### TC3: Slack 검증 (기존 + 스키마 보강)

| # | 조건 | 조작 | 기대 결과 |
|---|---|---|---|
| 3-1 | Slack ON, URL 없음 | 저장 클릭 | 에러: "Webhook URL을 입력해주세요", 저장 차단 |
| 3-2 | Slack ON, 유효한 hooks.slack.com URL | 저장 클릭 | 정상 저장 |
| 3-3 | Slack ON, 잘못된 URL | 저장 클릭 | 에러: "유효하지 않은 Slack Webhook URL", 저장 차단 |
| 3-4 | Slack OFF, URL 없음 | 저장 클릭 | 정상 저장 |

### TC4: 서버 사이드 검증 (Zod superRefine)

| # | 요청 | 기대 결과 |
|---|---|---|
| 4-1 | `emailEnabled: true, emailRecipients: []` 직접 POST | Zod 검증 실패, 400 응답 |
| 4-2 | `slackEnabled: true, slackWebhookUrl: null` 직접 POST | Zod 검증 실패, 400 응답 |
| 4-3 | `emailEnabled: false, emailRecipients: []` 직접 POST | 정상 처리 |

### TC5: 데이터 정합성

| # | 조건 | 기대 결과 |
|---|---|---|
| 5-1 | 기존 DB에 `emailEnabled: true, emailRecipients: []` 존재 | 마이그레이션/보정 스크립트로 `emailEnabled: false` 처리 |
| 5-2 | 저장 후 새로고침 | 저장된 값이 정확히 로드됨 |

## DB 비정합 데이터 보정

프로덕션 DB에서 아래 쿼리로 확인 및 보정:

```sql
-- 1. 비정합 데이터 확인
SELECT id, "projectId", "emailEnabled", "emailRecipients"
FROM "ProjectNotificationSetting"
WHERE "emailEnabled" = true
  AND ("emailRecipients" IS NULL OR "emailRecipients" = '[]');

-- 2. 보정 (emailEnabled → false)
UPDATE "ProjectNotificationSetting"
SET "emailEnabled" = false, "updatedAt" = NOW()
WHERE "emailEnabled" = true
  AND ("emailRecipients" IS NULL OR "emailRecipients" = '[]');
```

## 관련 파일

| 파일 | 변경 내용 |
|---|---|
| `apps/web/src/components/projects/notification-settings/index.tsx` | `handleSave`에 빈 수신자 검증 추가 |
| `apps/web/src/lib/schemas/server-input.ts` | `.superRefine()` 교차 검증 추가 |

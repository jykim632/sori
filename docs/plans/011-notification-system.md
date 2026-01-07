# Issue #11: 프로젝트 알림 시스템 구현

> **작성일**: 2025-01-06
> **수정일**: 2025-01-07 (에이전트 분석 결과 반영)
> **관련 이슈**: [#11 이메일 알림](https://github.com/solbox-project/sori/issues/11)

새 피드백 접수 시 **프로젝트별** 이메일/Slack 알림을 발송하는 기능

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2025-01-07 | PM/UX/백엔드 분석 반영: 테스트 버튼 제거, 체크박스 UX 개선, SSRF 방어 강화 |

---

## 요구사항 요약

| 항목 | 내용 |
|------|------|
| **범위** | 프로젝트 수준 설정 |
| **채널** | 이메일 (Resend) + Slack (Incoming Webhook) |
| **트리거** | 실시간 알림 |
| **필터** | 1단계 제외 (모든 피드백 알림) |

### 1단계 제외 (추후 구현)
- ~~피드백 타입별 필터~~ → 2단계로 이동
- 일일/주간 다이제스트
- Slack App OAuth 연동
- ~~테스트 알림 버튼~~ → 제거 (실제 피드백으로 테스트)

---

## 구현 순서

### Phase 1: DB 스키마

#### 1. SQL 실행 (Supabase Dashboard)

```sql
-- 프로젝트별 알림 설정 테이블
CREATE TABLE project_notification_setting (
  id VARCHAR(30) PRIMARY KEY,
  project_id VARCHAR(30) NOT NULL REFERENCES project(id) ON DELETE CASCADE,

  -- 이메일 알림
  email_enabled BOOLEAN DEFAULT false,
  email_recipients TEXT[] DEFAULT '{}',

  -- Slack 알림
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,

  -- feedback_types 필터는 2단계에서 추가
  -- feedback_types TEXT[] DEFAULT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(project_id)
);

CREATE INDEX idx_project_notification_setting_project
  ON project_notification_setting(project_id);
```

> **변경**: `feedback_types` 컬럼 1단계에서 제외. 나중에 nullable 컬럼으로 추가 가능.

#### 2. 코드 작업

| 파일 | 작업 |
|------|------|
| `docs/database-schema.md` | 테이블 문서 추가 |
| `packages/database/src/schemas/project-notification.ts` | Zod 스키마 |
| `packages/database/src/queries/project-notification.ts` | 쿼리 함수 |
| `packages/database/src/types.ts` | 타입 추가 |
| `packages/database/src/schemas/index.ts` | export |
| `packages/database/src/queries/index.ts` | export |

---

### Phase 2: 알림 발송 모듈

**디렉토리**: `apps/web/src/lib/notification/`

```
notification/
├── index.ts           # export
├── types.ts           # NotificationContext, NotificationSender
├── sender.ts          # sendProjectNotifications (Strategy 패턴)
├── email/
│   ├── index.ts       # createEmailSender (Resend)
│   └── template.ts    # HTML 템플릿
└── slack/
    └── index.ts       # createSlackSender (Webhook)
```

#### 타입 정의

```typescript
// types.ts
export interface NotificationContext {
  feedback: Feedback;
  project: Project;
  dashboardUrl: string;
}

export interface NotificationSender {
  send(context: NotificationContext): Promise<void>;
}

export interface NotificationResult {
  channel: 'email' | 'slack';
  success: boolean;
  error?: string;
}
```

#### 발송 오케스트레이션

```typescript
// sender.ts
export async function sendProjectNotifications(
  setting: ProjectNotificationSetting,
  context: NotificationContext
): Promise<void> {
  const senders: NotificationSender[] = [];

  if (setting.emailEnabled && setting.emailRecipients.length > 0) {
    senders.push(createEmailSender(setting.emailRecipients));
  }

  if (setting.slackEnabled && setting.slackWebhookUrl) {
    senders.push(createSlackSender(setting.slackWebhookUrl));
  }

  // 한 채널 실패가 다른 채널 차단하지 않음
  const results = await Promise.allSettled(senders.map((s) => s.send(context)));

  // 실패 로깅 (디버깅용)
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[notification] ${senders[i].constructor.name} failed:`, result.reason);
    }
  });
}
```

> **변경**: `Promise.allSettled` 사용, 실패 시 최소 로깅 추가

#### 이메일 템플릿 요소
- 피드백 타입별 헤더 색상 (BUG: 빨강, FEATURE: 초록, INQUIRY: 파랑)
- 프로젝트명, 피드백 유형, 내용
- 고객 이메일 (있을 경우)
- 접수 페이지 URL (metadata에서)
- "대시보드에서 확인하기" CTA 버튼

#### Slack 메시지 포맷 (플레인 텍스트)

```typescript
// 1단계: 단순 텍스트 포맷 (Block Kit은 2단계)
const message = `🔔 새 피드백 [${project.name}]
유형: ${feedback.type}
내용: ${feedback.message}
${dashboardUrl}`;
```

> **변경**: Block Kit 포맷팅 제거, 플레인 텍스트로 단순화

---

### Phase 3: 서버 함수

**파일**: `apps/web/src/server/project-notification.ts`

```typescript
// 알림 설정 조회
getNotificationSetting({ projectId })

// 알림 설정 저장 (upsert)
updateNotificationSetting({
  projectId,
  emailEnabled,
  emailRecipients,  // 최대 10개 제한
  slackEnabled,
  slackWebhookUrl
})

// 테스트 알림 발송 - 1단계 제외
// testNotificationSetting({ projectId, channel: 'email' | 'slack' })
```

> **변경**: 테스트 알림 함수 제거, 이메일 수신자 최대 10개 제한

**입력 스키마**: `apps/web/src/lib/schemas/server-input.ts`

```typescript
export const updateNotificationSettingSchema = z.object({
  projectId: z.string().min(1),
  emailEnabled: z.boolean(),
  emailRecipients: z
    .array(z.string().email())
    .max(10, '이메일 수신자는 최대 10명까지 가능합니다'),
  slackEnabled: z.boolean(),
  slackWebhookUrl: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith('https://hooks.slack.com/'),
      'Slack Webhook URL만 허용됩니다'
    )
    .nullable(),
});
```

---

### Phase 4: 피드백 API 통합

**파일**: `apps/web/src/routes/api/v1/feedback.ts`

피드백 생성 후 알림 트리거 (비동기, fire-and-forget):

```typescript
// 피드백 저장 후
const feedback = await createFeedback({ ... });

// 기존 Organization 웹훅 (유지)
for (const webhook of webhooks) {
  sendWebhook(webhook, feedback, project.name).catch(console.error);
}

// 신규: 프로젝트 알림 발송
const setting = await getProjectNotificationSetting(projectId);
if (setting && (setting.emailEnabled || setting.slackEnabled)) {
  sendProjectNotifications(setting, {
    feedback,
    project,
    dashboardUrl: `${APP_URL}/admin/feedbacks/${feedback.id}`
  }).catch((err) => {
    console.error('[notification] dispatch failed:', err);
  });
}
```

---

### Phase 5: 설정 UI

**파일**: `apps/web/src/routes/admin/projects/$projectId.tsx`

기존 프로젝트 설정 페이지에 "알림 설정" 섹션 추가:

```
┌─────────────────────────────────────────┐
│ 🔔 알림 설정                            │
├─────────────────────────────────────────┤
│ 이메일 알림                    [토글]   │
│ ├─ 수신자 이메일 (최대 10명)            │
│ │   ┌─────────────────────────────┐     │
│ │   │ admin@example.com      [✓] │     │  ← 이메일별 유효성 표시
│ │   │ team@example.com       [✓] │     │
│ │   │ invalid-email          [✗] │     │  ← 유효하지 않은 이메일 표시
│ │   └─────────────────────────────┘     │
│ └─ 한 줄에 하나씩 입력                  │
├─────────────────────────────────────────┤
│ Slack 알림                     [토글]   │
│ ├─ Webhook URL                          │
│ │   https://hooks.slack.com/services/...│
│ └─ Slack에서 Incoming Webhook 생성 방법 │  ← 도움말 링크
├─────────────────────────────────────────┤
│                    [저장] ← 저장 성공/실패 토스트 표시
└─────────────────────────────────────────┘
```

> **변경사항:**
> 1. 테스트 메시지 버튼 제거
> 2. 피드백 타입 필터 체크박스 제거 (1단계)
> 3. 이메일별 실시간 유효성 검사 표시 추가
> 4. 저장 후 토스트 알림 필수
> 5. Slack webhook 생성 도움말 링크 추가

#### UI 컴포넌트 구조

```
apps/web/src/components/projects/
└── notification-settings/
    ├── index.tsx              # Container with form state
    ├── email-section.tsx      # 이메일 설정 섹션
    └── slack-section.tsx      # Slack 설정 섹션
```

#### 저장 피드백 (필수)

```typescript
// 저장 성공
toast.success('알림 설정이 저장되었습니다');

// 저장 실패
toast.error('알림 설정 저장에 실패했습니다. 다시 시도해주세요.');
```

---

## 파일 목록 요약

### 신규 생성

| 파일 | 설명 |
|------|------|
| `packages/database/src/schemas/project-notification.ts` | Zod 스키마 |
| `packages/database/src/queries/project-notification.ts` | DB 쿼리 함수 |
| `apps/web/src/lib/notification/types.ts` | 타입 정의 |
| `apps/web/src/lib/notification/sender.ts` | 알림 발송 로직 |
| `apps/web/src/lib/notification/email/index.ts` | 이메일 발송 |
| `apps/web/src/lib/notification/email/template.ts` | HTML 템플릿 |
| `apps/web/src/lib/notification/slack/index.ts` | Slack 발송 |
| `apps/web/src/lib/notification/index.ts` | export |
| `apps/web/src/server/project-notification.ts` | 서버 함수 |
| `apps/web/src/components/projects/notification-settings/` | UI 컴포넌트 |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `docs/database-schema.md` | 테이블 문서 추가 |
| `packages/database/src/types.ts` | 타입 추가 |
| `packages/database/src/schemas/index.ts` | export 추가 |
| `packages/database/src/queries/index.ts` | export 추가 |
| `apps/web/src/lib/schemas/server-input.ts` | 입력 스키마 추가 |
| `apps/web/src/routes/api/v1/feedback.ts` | 알림 트리거 추가 |
| `apps/web/src/routes/admin/projects/$projectId.tsx` | UI 섹션 추가 |

---

## 보안 고려사항

| 항목 | 대응 |
|------|------|
| **SSRF 방지** | Slack URL `https://hooks.slack.com/` 접두사 검증 + **리다이렉트 비활성화** |
| **이메일 검증** | Zod `z.string().email()` + 최대 10개 제한 |
| **XSS 방지** | HTML 템플릿에서 사용자 입력 이스케이프 |
| **스팸 증폭 방지** | 이메일 수신자 수 제한 (10명) |

### SSRF 방어 코드

```typescript
// slack/index.ts
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: message }),
  redirect: 'error',  // 리다이렉트 시 에러 발생
  signal: AbortSignal.timeout(5000),
});
```

> **변경**: `redirect: 'error'` 옵션으로 리다이렉트 공격 방어

---

## 성능 고려사항

| 항목 | 방식 |
|------|------|
| 비동기 발송 | fire-and-forget (`.catch()` + 로깅) |
| 병렬 처리 | `Promise.allSettled([email, slack])` |
| 타임아웃 | 5초 (`AbortSignal.timeout(5000)`) |
| DB 쿼리 | 피드백당 1회 설정 조회 (현재 수준에서 허용) |

---

## 2단계 확장 계획 (추후)

1단계 완료 후 사용자 피드백에 따라 추가:

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| 피드백 타입 필터 | 높음 | `feedback_types` 컬럼 추가 |
| Slack Block Kit | 중간 | 리치 메시지 포맷 |
| 테스트 알림 버튼 | 낮음 | 실제 필요 확인 후 |
| 알림 히스토리 | 낮음 | 디버깅 목적 |
| 일일/주간 다이제스트 | 낮음 | 사용자 요청 시 |

---

## 분석 기반 의사결정 요약

| 분석 출처 | 반영 내용 |
|-----------|-----------|
| PM | 테스트 버튼 제거, 피드백 타입 필터 2단계로 이동, Slack 플레인 텍스트 |
| UX Critic | 저장 토스트 필수, 이메일별 유효성 표시, webhook 도움말 링크 |
| UI Implementer | 컴포넌트 구조 단순화, textarea 파싱 명확화 |
| Backend Architect | `feedback_types` 제거, `Promise.allSettled`, Factory 패턴 유지 |
| Backend Risk Guard | SSRF 리다이렉트 차단, 이메일 10개 제한, 실패 로깅 추가 |

# 프로젝트 알림 시스템 구현 보고서

> **작성일**: 2025-01-07
> **관련 이슈**: [#11 이메일 알림](https://github.com/solbox-project/sori/issues/11)
> **상태**: ✅ 구현 완료

---

## 1. 개요

새 피드백 접수 시 프로젝트별 이메일/Slack 알림을 발송하는 기능을 구현했습니다.

### 구현 범위

| 항목 | 상태 |
|------|------|
| 이메일 알림 (Resend) | ✅ 완료 |
| Slack 알림 (Webhook) | ✅ 완료 |
| 프로젝트별 설정 UI | ✅ 완료 |
| 피드백 API 연동 | ✅ 완료 |

### 1단계 제외 항목

- 피드백 타입별 필터
- 테스트 알림 버튼
- Slack Block Kit 포맷팅
- 일일/주간 다이제스트

---

## 2. 아키텍처

### 2.1 디렉토리 구조

```
packages/database/src/
├── schemas/project-notification.ts    # Zod 스키마
├── queries/project-notification.ts    # DB 쿼리 함수
└── types.ts                           # 타입 export

apps/web/src/
├── lib/notification/
│   ├── types.ts                       # NotificationContext, NotificationSender
│   ├── sender.ts                      # 발송 오케스트레이션
│   ├── email/
│   │   ├── index.ts                   # Resend 발송
│   │   └── template.ts                # HTML 템플릿
│   ├── slack/
│   │   └── index.ts                   # Webhook 발송
│   └── index.ts                       # export
├── server/project-notification.ts     # 서버 함수
├── components/projects/notification-settings/
│   ├── index.tsx                      # 메인 컴포넌트
│   ├── email-section.tsx              # 이메일 설정
│   └── slack-section.tsx              # Slack 설정
└── routes/api/v1/feedback.ts          # 알림 트리거 (수정)
```

### 2.2 데이터 모델

```sql
CREATE TABLE project_notification_setting (
  id VARCHAR(30) PRIMARY KEY,
  project_id VARCHAR(30) NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT false,
  email_recipients TEXT[] DEFAULT '{}',
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id)
);
```

### 2.3 발송 흐름

```
피드백 API 호출
    ↓
피드백 저장 (DB)
    ↓
알림 설정 조회
    ↓
sendProjectNotifications() [fire-and-forget]
    ↓
┌─────────────────────────────────────┐
│  Promise.allSettled([              │
│    createEmailSender() → Resend    │
│    createSlackSender() → Webhook   │
│  ])                                 │
└─────────────────────────────────────┘
    ↓
실패 시 console.error 로깅
```

---

## 3. 보안 구현

### 3.1 SSRF 방어

| 방어 기법 | 구현 위치 |
|-----------|-----------|
| Slack hostname 정확 검증 | Zod 스키마, 클라이언트 검증 |
| 리다이렉트 차단 | `fetch({ redirect: "error" })` |
| 타임아웃 설정 | `AbortSignal.timeout(5000)` |

```typescript
// hostname 정확 검증 (startsWith 우회 방지)
const parsed = new URL(url);
return parsed.hostname === "hooks.slack.com";
```

### 3.2 입력 검증

| 항목 | 검증 방법 |
|------|-----------|
| 이메일 주소 | `z.string().email()` |
| 이메일 수신자 수 | `.max(10)` |
| Slack URL 형식 | `z.string().url()` + hostname 검증 |

### 3.3 XSS 방어

이메일 템플릿에서 모든 사용자 입력 이스케이프:

```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

---

## 4. 에러 처리

### 4.1 환경변수 검증

```typescript
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.warn("[notification] RESEND_API_KEY is not configured");
}
```

### 4.2 발송 실패 처리

- `Promise.allSettled` 사용으로 한 채널 실패가 다른 채널에 영향 없음
- 실패 시 로깅만 수행 (fire-and-forget 패턴)

```typescript
results.forEach((result, i) => {
  if (result.status === "rejected") {
    console.error(`[notification] ${senders[i].channel} failed:`, result.reason);
  }
});
```

---

## 5. 코드 리뷰 결과

### 5.1 수정된 이슈

| 심각도 | 이슈 | 상태 |
|--------|------|------|
| 🔴 Critical | SSRF: Slack URL `startsWith` 우회 가능 | ✅ 수정됨 |
| 🔴 Critical | RESEND_API_KEY 미검증 시 런타임 에러 | ✅ 수정됨 |
| 💡 Suggestion | Slack input 접근성 속성 누락 | ✅ 수정됨 |
| 💡 Suggestion | metadata.url 타입 단언 불안전 | ✅ 수정됨 |

### 5.2 수용된 설계 결정

| 이슈 | 판단 | 근거 |
|------|------|------|
| 스키마 중복 (DRY) | 수용 | DB/API 검증 의도적 분리 |
| Silent fail (재시도 없음) | 수용 | fire-and-forget 설계 의도 |
| 트랜잭션 없이 알림 발송 | 수용 | 피드백 저장 성공 후 발송 |
| 알림 Rate limiting 없음 | 수용 | 피드백 API에 이미 적용 |

### 5.3 추가 수정 항목

| 이슈 | 상태 |
|------|------|
| Rate limit Map 메모리 누수 | ✅ 수정됨 (5분 주기 정리) |

### 5.4 향후 개선 검토 항목

- 이메일 템플릿 분리 (템플릿 다양화 시)
- 알림 결과 반환값 (모니터링 필요 시)

---

## 6. 환경 설정

### 6.1 필수 환경변수

```bash
# .env
RESEND_API_KEY=re_xxxxxxxxxxxx           # Resend API 키
NOTIFICATION_FROM_EMAIL=noreply@mail.sori.life  # 발신자 이메일
APP_URL=https://web.sori.life            # 대시보드 URL
```

### 6.2 Resend 설정

1. [Resend 대시보드](https://resend.com/domains)에서 도메인 인증
2. DNS 레코드 추가 (SPF, DKIM)
3. API 키 발급

---

## 7. 테스트 체크리스트

### 7.1 기능 테스트

- [x] 이메일 알림 활성화/비활성화
- [x] 복수 이메일 수신자 설정
- [x] 이메일 유효성 검사 피드백
- [x] Slack 알림 활성화/비활성화
- [x] Slack Webhook URL 검증
- [x] 설정 저장/로드
- [x] 피드백 접수 시 알림 발송

### 7.2 보안 테스트

- [x] 잘못된 Slack URL 거부 (`hooks.slack.com.attacker.com`)
- [x] 10개 초과 이메일 수신자 거부
- [x] 유효하지 않은 이메일 형식 거부

---

## 8. 파일 변경 목록

### 8.1 신규 생성 (13개)

```
packages/database/src/schemas/project-notification.ts
packages/database/src/queries/project-notification.ts
apps/web/src/lib/notification/types.ts
apps/web/src/lib/notification/sender.ts
apps/web/src/lib/notification/email/index.ts
apps/web/src/lib/notification/email/template.ts
apps/web/src/lib/notification/slack/index.ts
apps/web/src/lib/notification/index.ts
apps/web/src/server/project-notification.ts
apps/web/src/components/projects/notification-settings/index.tsx
apps/web/src/components/projects/notification-settings/email-section.tsx
apps/web/src/components/projects/notification-settings/slack-section.tsx
docs/plans/011-notification-system-report.md
```

### 8.2 수정 (7개)

```
packages/database/src/schemas/index.ts          # export 추가
packages/database/src/queries/index.ts          # export 추가
packages/database/src/types.ts                  # 타입 추가
apps/web/src/lib/schemas/server-input.ts        # 입력 스키마 추가
apps/web/src/routes/api/v1/feedback.ts          # 알림 트리거 추가
apps/web/src/routes/admin/projects/$projectId.tsx  # UI 통합
docs/plans/011-notification-system.md           # 계획 문서 업데이트
```

---

## 9. 2단계 확장 계획

| 기능 | 우선순위 | 구현 복잡도 |
|------|----------|-------------|
| 피드백 타입별 필터 | 높음 | 낮음 |
| Slack Block Kit 포맷 | 중간 | 낮음 |
| 테스트 알림 버튼 | 낮음 | 중간 |
| 알림 히스토리 | 낮음 | 중간 |
| 일일/주간 다이제스트 | 낮음 | 높음 |
| 재시도/큐 시스템 | 낮음 | 높음 |

---

## 10. 결론

프로젝트 알림 시스템 1단계가 성공적으로 구현되었습니다.

- **보안**: SSRF, XSS, 입력 검증 구현 완료
- **안정성**: 에러 격리, 환경변수 검증, 타임아웃 적용
- **확장성**: Strategy 패턴으로 채널 추가 용이
- **사용성**: 실시간 유효성 검사, 토스트 피드백

코드 리뷰를 통해 2건의 Critical 이슈와 2건의 개선 사항을 수정했으며, 나머지 항목은 의도된 설계로 확인되었습니다.

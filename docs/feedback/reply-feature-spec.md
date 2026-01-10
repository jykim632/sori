# 피드백 답글 기능 기획서

> 작성일: 2026-01-10
> 버전: **v2.0 (최종 확정)**
> 상태: 개발 진행 중
> GitHub Issue: [#57](https://github.com/jykim632/sori/issues/57)

---

## 1. 개요

피드백에 대해 사용자와 고객이 대화를 이어갈 수 있는 답글(Reply) 기능을 구현한다.

### MVP 스코프

> 핵심 가치: "고객과 사용자가 피드백에 대해 대화할 수 있다"

**MVP 포함 (Must Have)**

| 기능 | 이유 |
|------|------|
| Feedback에 token 컬럼 추가 | 고객 접근 필수 |
| 토큰 만료 정책 (6개월) | 보안 필수 |
| 고객용 토큰 페이지 (`/f/{token}`) | 핵심 기능 |
| 고객이 Reply 작성 | 핵심 기능 |
| Admin이 Reply 작성 | 핵심 기능 |
| Admin 답변 시 고객 이메일 발송 | 대화 연결 필수 |
| **고객 질문 시 Admin 알림 (웹훅)** | 양방향 대화 필수 |
| 에러 페이지 (404, 만료 등) | 기본 UX |
| **Rate limiting** | 공개 API 보안 필수 |
| **XSS 방지** | 공개 페이지 보안 필수 |
| **위젯 이메일 필수화** | 알림 발송 필수 |
| isInternal (내부 메모) | 이미 구현됨 |

**MVP 제외 (Post-MVP)**

| 기능 | 제외 이유 |
|------|----------|
| 24시간 경과 배지 | 편의 기능 |
| 종료 시 이메일 발송 | 없어도 작동함 |

**MVP 구현 체크리스트**

```
Phase 1: 데이터 (1일)
- [ ] Feedback에 token, token_accessed_at 컬럼 추가
- [ ] Reply 테이블 생성 (AuthorType: ADMIN, CUSTOMER, API)
- [ ] replies 테이블 인덱스 추가
- [ ] 기존 Feedback에 token 백필
- [ ] 위젯 이메일 필수 입력으로 변경

Phase 2: 고객 페이지 (2일)
- [ ] /f/[token] 라우트 생성 (인증 체크 제외)
- [ ] 피드백 + Reply 조회 API (Pagination 포함)
- [ ] 대화 내역 UI
- [ ] Reply 작성 폼 + API
- [ ] 에러 페이지 (404, 만료, Rate limit 등)
- [ ] Rate limiting 적용
- [ ] XSS 방지 (HTML escape)
- [ ] SEO/보안 메타 태그 적용

Phase 3: Admin 연동 (1일)
- [ ] 피드백 상세에 대화 내역 표시
- [ ] Reply 작성 폼 + API
- [ ] 피드백 상세에서 토큰 링크 복사 기능

Phase 4: 알림 (1일)
- [ ] Admin 답변 시 → 고객 이메일 발송
- [ ] 고객 질문 시 → Admin 알림 (웹훅)
- [ ] 이메일 템플릿 구현
```

### 용어 정의

| 용어 | 설명 | Sori 접근 |
|------|------|----------|
| **사용자** | Sori를 사용하는 플랫폼 (B2B 고객) | Admin Web 로그인 |
| **고객** | 플랫폼을 사용하는 최종 사용자 | 토큰 링크로만 접근 |

---

## 2. 핵심 컨셉

### 티켓 기반 대화

- 고객의 피드백 1건 = 티켓 1개
- 티켓 내에서 사용자와 고객이 댓글로 대화
- 고유 토큰으로 고객이 로그인 없이 대화 참여

### 접근 방식

| 역할 | 접근 경로 | 할 수 있는 것 |
|------|----------|--------------|
| 사용자 | Sori Admin Web (`/admin/feedbacks`) | 모든 피드백 조회, 답변 작성, 상태 변경 |
| 고객 | 토큰 페이지 (`/f/{token}`) | 본인 피드백만 조회, 추가 메시지 작성 (OPEN/IN_PROGRESS만) |

### 이메일 필수 정책

- 위젯에서 피드백 제출 시 **이메일 입력 필수**
- 이메일 미입력 시 피드백 제출 불가
- 이유: 답변 알림 발송 및 대화 연속성 확보
- **이메일 없는 피드백은 존재하지 않음**

---

## 3. 플로우

### 3.1 기본 플로우

```
┌─────────────────────────────────────────────────────────────────┐
│ [1] 고객이 위젯에서 피드백 제출 (이메일 필수)                        │
│     → Feedback 생성 (status: OPEN, token 발급)                   │
│     → 사용자에게 알림 (Slack/이메일)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [2] 사용자가 Admin Web에서 답변 작성                               │
│     → Reply 생성 (authorType: ADMIN)                            │
│     → 고객에게 이메일 발송 (토큰 링크 포함)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [3] 고객이 이메일의 "답변 보기" 링크 클릭                            │
│     → /f/{token} 페이지 접근 (token_accessed_at 갱신)             │
│     → 피드백 원문 + 대화 내역 확인                                  │
│     → 추가 질문 작성 가능 (OPEN/IN_PROGRESS 상태만)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [4] 고객이 추가 질문 작성                                          │
│     → Reply 생성 (authorType: CUSTOMER)                         │
│     → 사용자에게 알림 (Slack/웹훅)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [2]~[4] 반복 가능
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ [5] 종료                                                        │
│     - 사용자가 수동으로 RESOLVED/CLOSED 처리                       │
│     - CLOSED 상태에서는 고객이 Reply 작성 불가                      │
│     - 추가 문의 필요 시 새 피드백 생성 유도                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 CLOSED 피드백 처리

```
[CLOSED 상태 토큰 페이지 접근]
    → 기존 대화 내역 조회 가능 (읽기 전용)
    → Reply 입력 폼 비활성화
    → "문의가 종료되었습니다. 추가 문의는 새로 작성해주세요." 안내
    → [새 문의하기] 버튼 → 위젯 열기 또는 안내 페이지
```

---

## 4. 상태 관리

### 상태 정의

| 상태 | 설명 | 전환 조건 | Reply 작성 |
|------|------|----------|-----------|
| `OPEN` | 새 문의 또는 대화 진행 중 | 피드백 생성 시 | 가능 |
| `IN_PROGRESS` | 사용자가 확인 중 | 사용자가 수동 변경 | 가능 |
| `RESOLVED` | 해결됨 (사용자 판단) | 사용자가 수동 변경 | 불가 |
| `CLOSED` | 비활성 (종료) | 사용자가 수동 변경 | 불가 |

### 24시간 경과 표시 (Post-MVP)

> 백엔드에서 computed field로 계산하여 제공

```sql
SELECT f.*,
  CASE
    WHEN f.status IN ('OPEN', 'IN_PROGRESS')
      AND last_reply.author_type = 'ADMIN'
      AND last_reply.created_at < NOW() - INTERVAL '24 hours'
    THEN true
    ELSE false
  END as is_waiting_expired
FROM feedbacks f
LEFT JOIN LATERAL (
  SELECT author_type, created_at
  FROM replies WHERE feedback_id = f.id
  ORDER BY created_at DESC LIMIT 1
) last_reply ON true;
```

---

## 5. 토큰 설계

### 토큰 특성

| 항목 | 값 |
|------|-----|
| 형식 | UUID v4 |
| 생성 시점 | 피드백 생성 시 자동 발급 |
| **만료** | **마지막 접근 후 6개월 미접근 시** |
| 용도 | 고객의 비로그인 접근 |

### 토큰 만료 정책

```sql
-- Feedback 테이블 컬럼 추가
ALTER TABLE feedbacks ADD COLUMN token_accessed_at TIMESTAMPTZ;

-- 토큰 접근 시 갱신
UPDATE feedbacks SET token_accessed_at = now() WHERE token = $1;

-- 6개월 미접근 토큰 무효화 (배치 또는 조회 시 체크)
-- token_accessed_at이 NULL이면 created_at 기준
WHERE COALESCE(token_accessed_at, created_at) < NOW() - INTERVAL '6 months'
```

### URL 구조

```
https://app.sori.life/f/{token}

예시:
https://app.sori.life/f/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 보안

- UUID v4는 추측 불가능 (충분한 엔트로피)
- 이메일로만 전달 → 이메일 보안 = 토큰 보안
- **Rate limiting 적용 (MVP 필수)**
- **XSS 방지: Reply content 렌더링 시 HTML escape 필수 (MVP 필수)**
- 토큰 노출 방지: `<meta name="referrer" content="no-referrer">` 적용
- 검색 엔진 제외: `<meta name="robots" content="noindex, nofollow">` 적용

---

## 6. 데이터 모델

### 6.1 Feedback 테이블 변경

```sql
ALTER TABLE feedbacks
ADD COLUMN token UUID DEFAULT gen_random_uuid() NOT NULL,
ADD COLUMN token_accessed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_feedbacks_token ON feedbacks(token);
```

### 6.2 Reply 테이블

```sql
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) <= 5000),
  feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL,  -- 스냅샷 (필수)
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('ADMIN', 'CUSTOMER', 'API')),
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_admin_has_author CHECK (
    author_type = 'CUSTOMER' OR author_id IS NOT NULL
  )
);

CREATE INDEX idx_replies_feedback_id ON replies(feedback_id);
CREATE INDEX idx_replies_created_at ON replies(feedback_id, created_at);
```

### 6.3 Reply 스키마

```typescript
// packages/database/src/schemas/reply.ts

export const AuthorType = z.enum(["ADMIN", "CUSTOMER", "API"]);
// ADMIN: Sori 사용자 (B2B 고객사 담당자)
// CUSTOMER: 피드백 작성자 (최종 사용자)
// API: API를 통한 자동 답변

export const ReplySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  feedbackId: z.string().uuid(),
  authorId: z.string().uuid().nullable(),    // CUSTOMER는 null
  authorName: z.string().min(1).max(100),    // 필수 (스냅샷)
  authorType: AuthorType,
  isInternal: z.boolean().default(false),    // 내부 메모 (고객에게 안 보임)
  createdAt: z.date(),
});
```

### 6.4 전체 데이터 구조

```
Feedback (티켓)
├── id: UUID
├── token: UUID
├── token_accessed_at: timestamp | null
├── type: BUG | INQUIRY | FEATURE
├── message: string
├── email: string (필수)
├── status: OPEN | IN_PROGRESS | RESOLVED | CLOSED
├── priority: LOW | MEDIUM | HIGH | URGENT | null
├── metadata: JSON | null
├── projectId: UUID
├── createdAt: timestamp
├── resolvedAt: timestamp | null
│
└── Reply[] (대화)
    ├── id: UUID
    ├── content: string
    ├── authorType: ADMIN | CUSTOMER | API
    ├── authorName: string (필수, 스냅샷)
    ├── authorId: UUID | null
    ├── isInternal: boolean
    └── createdAt: timestamp
```

---

## 7. 페이지 설계

### 7.1 고객용 토큰 페이지 (`/f/{token}`)

**접근 조건:** 토큰만 있으면 접근 가능 (비로그인, 인증 체크 제외)

**필수 메타 태그:**
```html
<head>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="referrer" content="no-referrer" />
</head>
```

**화면 구성 (OPEN/IN_PROGRESS):**
```
┌─────────────────────────────────────────────┐
│  [프로젝트명] 문의 내역                        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [BUG] 원본 피드백 내용               │   │
│  │ 2026-01-10 14:30                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 담당자 답변 내용                      │   │  ← ADMIN
│  │ 홍길동 · 2026-01-10 15:00           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 고객 추가 질문                        │   │  ← CUSTOMER
│  │ 2026-01-10 15:30                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  [추가 메시지 입력]                          │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                            [보내기]         │
└─────────────────────────────────────────────┘
```

**화면 구성 (RESOLVED/CLOSED):**
```
┌─────────────────────────────────────────────┐
│  [프로젝트명] 문의 내역                        │
├─────────────────────────────────────────────┤
│  ⚠️ 이 문의는 종료되었습니다.                  │
│     추가 문의가 필요하시면 새로 작성해주세요.    │
│                     [새 문의하기]             │
├─────────────────────────────────────────────┤
│  (기존 대화 내역 - 읽기 전용)                  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### 7.2 에러 페이지

| 상황 | HTTP 상태 | 사용자 메시지 |
|------|----------|--------------|
| 토큰 형식 오류 | 400 | "잘못된 링크입니다" |
| 토큰 미존재 | 404 | "문의를 찾을 수 없습니다" |
| **토큰 만료 (6개월)** | 410 | "링크가 만료되었습니다" |
| 피드백 삭제됨 | 410 | "삭제된 문의입니다" |
| Rate limit 초과 | 429 | "잠시 후 다시 시도해주세요" |
| 서버 오류 | 500 | "일시적인 오류가 발생했습니다" |

### 7.3 Admin Web 피드백 상세 모달

**추가 요소:**
- 대화 내역 표시 (시간순)
- 답변 입력 폼
- 내부 메모 토글 (isInternal: true → 고객에게 안 보임)
- **토큰 링크 복사 버튼** (고객에게 직접 전달용)

### 7.4 라우트 구조

```
apps/web/src/routes/
├── f/
│   └── $token.tsx   # 고객용 (비인증, 인증 체크 제외)
├── admin/
│   └── feedbacks.tsx # Admin (인증 필요)
```

---

## 8. 알림 설계

### 8.1 Admin → 고객 (이메일)

**트리거:** Admin이 Reply 작성 시 (isInternal: false)

```
제목: [프로젝트명] 문의에 답변이 달렸습니다

안녕하세요,

회원님의 문의에 답변이 달렸습니다.

---
{답변 내용 미리보기 (최대 200자)}
---

전체 내용을 확인하고 추가 질문을 남기시려면 아래 버튼을 클릭해주세요.

[답변 확인하기] → https://app.sori.life/f/{token}

감사합니다.
{프로젝트명} 팀
```

### 8.2 고객 → Admin (웹훅)

**트리거:** 고객이 Reply 작성 시

- Slack/Discord 웹훅 (설정된 경우)
- 이메일 (설정된 경우)

**웹훅 페이로드:**
```json
{
  "type": "customer_reply",
  "feedback": {
    "id": "...",
    "type": "BUG",
    "email": "customer@example.com"
  },
  "reply": {
    "content": "추가 질문 내용...",
    "createdAt": "2026-01-10T15:30:00Z"
  },
  "url": "https://app.sori.life/admin/feedbacks?id=..."
}
```

---

## 9. API 설계

### 9.1 고객용 API (Tickets)

```
GET  /api/v1/tickets/{token}
     → 피드백 + Reply 목록 조회 (isInternal: false만)
     → token_accessed_at 갱신
     → Pagination: ?limit=50&cursor=xxx

     Response:
     {
       "feedback": { ... },
       "replies": [ ... ],
       "nextCursor": "xxx" | null,
       "canReply": true | false  // status가 OPEN/IN_PROGRESS면 true
     }

POST /api/v1/tickets/{token}/replies
     → 고객 Reply 생성 (status가 OPEN/IN_PROGRESS인 경우만)
     Body: { content: string }

     Response:
     { "id": "...", "createdAt": "..." }
```

### 9.2 Admin용 API (기존 확장)

```
GET  /api/v1/feedbacks/{id}/replies
     → Reply 목록 조회 (isInternal 포함)
     → Pagination: ?limit=50&cursor=xxx

POST /api/v1/feedbacks/{id}/replies
     → 사용자 Reply 생성
     Body: { content: string, isInternal?: boolean }
```

### 9.3 Rate Limiting

| 엔드포인트 | 제한 | 기준 |
|-----------|------|------|
| GET /api/v1/tickets/{token} | 60 req/min | IP |
| POST /api/v1/tickets/{token}/replies | 10 req/min | IP + token |

---

## 10. 구현 체크리스트 (전체 스코프)

### Phase 1: 데이터 모델 (MVP)

- [ ] Feedback 테이블에 token, token_accessed_at 컬럼 추가
- [ ] Reply 테이블 생성 (AuthorType: ADMIN, CUSTOMER, API)
- [ ] replies 테이블 인덱스 추가
- [ ] 기존 Feedback에 token 백필
- [ ] 위젯 이메일 필수 입력으로 변경

### Phase 2: 고객용 토큰 페이지 (MVP)

- [ ] `/f/$token` 라우트 생성 (인증 체크 제외)
- [ ] SEO/보안 메타 태그 적용
- [ ] 피드백 + Reply 조회 API (Pagination 포함)
- [ ] 대화 내역 UI
- [ ] 고객 메시지 입력 폼 (OPEN/IN_PROGRESS만)
- [ ] CLOSED 상태 안내 UI (새 문의 유도)
- [ ] Reply 생성 API (고객용)
- [ ] 에러 페이지 (404, 만료, Rate limit 등)
- [ ] Rate limiting 적용
- [ ] XSS 방지 (HTML escape)

### Phase 3: Admin Web 수정 (MVP)

- [ ] 피드백 상세 모달에 대화 내역 표시
- [ ] 답변 입력 폼 추가
- [ ] 내부 메모 토글 (isInternal)
- [ ] Reply 생성 API (사용자용)
- [ ] 토큰 링크 복사 버튼

### Phase 4: 알림 (MVP)

- [ ] Admin 답변 시 → 고객 이메일 발송
- [ ] 고객 질문 시 → Admin 알림 (웹훅)
- [ ] 이메일 템플릿 구현

### Phase 5: Post-MVP 기능

- [ ] 피드백 목록에 "응답 대기 24시간 경과" 배지 표시
- [ ] 피드백 상세 모달에 "응답 대기 24시간 경과" 배지 표시
- [ ] 종료 시 이메일 발송
- [ ] 토큰 만료 배치 작업 (6개월 미접근)

---

## 11. 향후 고려사항

- [ ] 파일 첨부 (스크린샷 등)
- [ ] 고객 만족도 평가 (종료 시)
- [ ] 답변 템플릿 (자주 쓰는 답변 저장)
- [ ] SLA 설정 (응답 시간 목표)

---

## 12. Acceptance Criteria (테스트용)

### 테스트 코드 담당

> 각 개발자가 본인 담당 영역의 테스트 코드를 작성합니다.

| 영역 | 담당 | 테스트 대상 | 파일 위치 |
|------|------|------------|----------|
| Database 쿼리 | DBA | `getFeedbackByToken`, `isTokenExpired`, reply CRUD | `packages/database/src/queries/*.test.ts` |
| API 엔드포인트 | Backend | `/api/v1/tickets/*`, rate limiting, 에러 응답 | `apps/web/src/routes/api/**/*.test.ts` |
| 순수 함수 | Backend | `escapeHtml`, 토큰 검증 로직 | `apps/web/src/lib/**/*.test.ts` |
| 위젯 | Frontend | 이메일 검증, 폼 제출, 필수값 체크 | `packages/core/src/*.test.ts` |
| UI 컴포넌트 | Frontend | `/f/$token` 페이지 렌더링, 상태별 UI | `apps/web/src/routes/f/*.test.ts` |

**테스트 커버리지 목표:** 핵심 로직 80% 이상


### 토큰 페이지 접근

```
Given: 유효한 토큰으로 /f/{token} 접근
When: 페이지 로드
Then: 피드백 원문 + Reply 목록(isInternal=false만) 표시
      token_accessed_at 갱신됨

Given: 무효한 토큰으로 /f/{invalid} 접근
When: 페이지 로드
Then: 404 에러 페이지 표시

Given: 6개월 이상 미접근 토큰으로 접근
When: 페이지 로드
Then: 410 에러 페이지 (링크 만료) 표시
```

### 고객 Reply 생성

```
Given: OPEN 상태의 피드백 토큰 페이지에서
When: Reply 작성 및 제출
Then: Reply 생성 + Admin에게 웹훅 알림

Given: CLOSED 상태의 피드백 토큰 페이지에서
When: 페이지 로드
Then: 입력 폼 비활성화 + "새 문의하기" 버튼 표시

Given: 유효한 토큰 페이지에서
When: 빈 내용으로 Reply 제출
Then: 에러 메시지 표시, 제출 안 됨

Given: 유효한 토큰 페이지에서
When: 5000자 초과 내용으로 Reply 제출
Then: 에러 메시지 표시, 제출 안 됨
```

### Rate Limiting

```
Given: 동일 IP에서 /api/v1/tickets/{token}
When: 1분 내 61번째 요청
Then: 429 에러 반환

Given: 동일 IP+토큰에서 POST /api/v1/tickets/{token}/replies
When: 1분 내 11번째 요청
Then: 429 에러 반환
```

---

## Changelog

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-10 | v1.0 | 초안 작성 | 기획 |
| 2026-01-10 | v1.1 | PM 리뷰 반영 | PM |
| 2026-01-10 | v1.2 | 자동 종료 → UI 표시로 변경, 이메일 필수 정책 | 기획 |
| 2026-01-10 | v1.3 | MVP 스코프 정의 | PM |
| 2026-01-10 | v1.4 | 프론트엔드 리뷰 반영 | Frontend |
| 2026-01-10 | v1.5 | 백엔드 리뷰 반영 | Backend |
| 2026-01-10 | **v2.0** | **최종 확정**: AuthorType에 API 추가, 토큰 6개월 만료, API를 tickets로 변경, CLOSED 상태 Reply 불가 (새 피드백 유도), Pagination 추가, 양방향 알림 MVP 포함, 보안 MVP 필수 | 기획 |
| 2026-01-11 | v2.0.1 | 현재 구현 상태 분석 및 Gap 분석, 구현 필요 항목 체크리스트 추가 | DBA/Dev |
| 2026-01-11 | v2.0.2 | PM 검증 완료: 구현 완료율 99%, Backend/Frontend 할 일 정리, 위젯 이메일 필수화만 남음 | PM |
| 2026-01-11 | **v2.0.3** | 테스트 코드 담당자 명시 (각 개발자가 본인 영역 담당) | PM |

---

## 13. 현재 구현 상태 (v2.0.2 - PM 검증 완료)

> 검증일: 2026-01-11
> 검증자: PM

### 구현 완료율: 99%

| 카테고리 | 상태 | 완료율 | 담당 |
|----------|------|--------|------|
| Database Schema | ✅ 완료 | 100% | DBA |
| API Endpoints | ✅ 완료 | 100% | Backend |
| Frontend `/f/$token` 페이지 | ✅ 완료 | 100% | Frontend |
| Server Functions | ✅ 완료 | 100% | Backend |
| 알림 (이메일/웹훅) | ✅ 완료 | 100% | Backend |
| 보안 (XSS, Rate Limiting) | ✅ 완료 | 100% | Backend |
| **위젯 이메일 필수화** | ⚠️ 미완료 | 0% | Frontend |

### 상세 구현 현황

#### Database (DBA 완료)
- [x] `feedback.token` 컬럼 추가 (UUID, UNIQUE INDEX)
- [x] `feedback.token_accessed_at` 컬럼 추가
- [x] `replies` 테이블 생성
- [x] AuthorType enum: `CUSTOMER`, `ADMIN`, `API`
- [x] 마이그레이션 스크립트 (`001_add_feedback_token.sql`, `002_migrate_user_to_customer.sql`)
- [x] 토큰 관련 쿼리 함수 (`getFeedbackByToken`, `updateTokenAccessedAt`, `isTokenExpired`)

#### API (Backend 완료)
- [x] `GET /api/v1/tickets/{token}` - 피드백 + 답글 조회
- [x] `POST /api/v1/tickets/{token}/replies` - 고객 답글 생성
- [x] Rate limiting (60 req/min GET, 10 req/min POST)
- [x] 토큰 만료 검증 (6개월)
- [x] `token_accessed_at` 자동 갱신
- [x] CLOSED 상태 Reply 차단

#### Frontend (대부분 완료)
- [x] `/f/$token` 라우트 (인증 체크 제외)
- [x] 대화 내역 UI (ADMIN/CUSTOMER 구분)
- [x] Reply 입력 폼 (OPEN/IN_PROGRESS만)
- [x] CLOSED 상태 안내 UI
- [x] 에러 페이지 (400, 404, 410, 429, 500)
- [x] SEO/보안 메타 태그 (`noindex`, `no-referrer`)
- [x] XSS 방지 (`escapeHtml`)
- [ ] **위젯 이메일 필수화** ← 유일한 미완료 항목

#### 알림 (Backend 완료)
- [x] Admin 답변 시 → 고객 이메일 발송 (`lib/notification/email/customer.ts`)
- [x] 고객 질문 시 → Admin 웹훅 알림 (Slack, Discord, Custom)

### 미완료 항목 (1개)

| 항목 | 담당 | 파일 | 작업 내용 |
|------|------|------|----------|
| 위젯 이메일 필수화 | Frontend | `packages/core/src/widget.ts` | `required` 속성 추가 + 검증 로직 |

**현재 상태:**
```html
<input type="email" placeholder="Email (선택)" />
```

**변경 필요:**
```html
<input type="email" placeholder="Email" required />
```
+ 제출 전 이메일 유효성 검증 로직 추가

---

## 14. 구현 체크리스트 (v2.0.2 업데이트)

> ✅ = 완료, ⚠️ = 미완료

### Phase 1: 데이터베이스 변경 ✅ 완료

- [x] `feedback.token` 컬럼 추가 (UUID, NOT NULL, DEFAULT)
- [x] `feedback.token_accessed_at` 컬럼 추가
- [x] `idx_feedback_token` UNIQUE 인덱스 생성
- [x] `replies` 테이블 생성
- [x] AuthorType enum: `CUSTOMER`, `ADMIN`, `API`
- [x] 마이그레이션 스크립트 작성
- [x] 스키마 파일 업데이트 (`feedback.ts`, `reply.ts`)
- [x] 쿼리 함수 추가 (`getFeedbackByToken`, `updateTokenAccessedAt`, `isTokenExpired`)

### Phase 2: 고객용 토큰 페이지 ✅ 완료

**라우트:**
- [x] `apps/web/src/routes/f/$token.tsx` - 고객용 페이지 (인증 체크 제외)

**API:**
- [x] `apps/web/src/routes/api/v1/tickets.$token.ts` - GET
- [x] `apps/web/src/routes/api/v1/tickets.$token.replies.ts` - POST

**기능:**
- [x] 토큰 유효성 검증
- [x] 토큰 만료 검증 (6개월)
- [x] token_accessed_at 갱신
- [x] CLOSED 상태 처리 (읽기 전용)
- [x] Rate limiting (60 req/min GET, 10 req/min POST)
- [x] SEO/보안 메타 태그 (`noindex`, `nofollow`, `no-referrer`)
- [x] XSS 방지 (`escapeHtml`)

**UI:**
- [x] 피드백 원문 표시
- [x] 대화 내역 표시 (isInternal=false만)
- [x] 답글 입력 폼 (OPEN/IN_PROGRESS만)
- [x] CLOSED 상태 안내 + "새 문의하기" 버튼
- [x] 에러 페이지 (400, 404, 410, 429, 500)
- [x] 글자 수 카운터

### Phase 3: Admin 연동 ✅ 완료

- [x] 피드백 상세에서 대화 내역 표시
- [x] Reply 작성 폼 + isInternal 토글
- [x] 피드백 생성 시 토큰 자동 발급
- [x] 토큰 링크 복사 버튼

### Phase 4: 알림 ✅ 완료

- [x] Admin 답변 시 → 고객 이메일 발송 (`lib/notification/email/customer.ts`)
- [x] 고객 질문 시 → Admin 웹훅 알림 (Slack, Discord, Custom)
- [x] 이메일 템플릿 구현

### Phase 5: 위젯 ⚠️ 미완료

- [ ] **이메일 필수 입력으로 변경** (`packages/core/src/widget.ts`)

---

## 15. DBA 검토 의견 ✅ 반영 완료

> 참조: `docs/feedback/dba-feedback.md`

### 스키마 변경 ✅ 완료

1. **token 인덱스**: ✅ UNIQUE 인덱스 생성됨
2. **token_accessed_at 인덱스**: ✅ 부분 인덱스 생성됨
3. **AuthorType 마이그레이션**: ✅ USER → CUSTOMER 완료

### Rate Limiting ✅ 구현 완료

```typescript
// apps/web/src/routes/api/v1/tickets.$token.ts
const ticketRateLimitMap = new Map<string, { count: number; resetTime: number }>();
```

### 보안 체크리스트 ✅ 완료

- [x] 토큰 페이지에서 다른 피드백 조회 불가 확인
- [x] XSS 방지 (`escapeHtml` 함수 적용)
- [x] Rate limit 구현 (GET 60/min, POST 10/min)
- [x] 토큰 만료 검증 (6개월)

---

## 16. 에이전트별 남은 작업

### Backend 에이전트: 할 일 없음 ✅

모든 API, 쿼리, 서버 함수, 알림 시스템이 구현 완료되었습니다.

### Frontend 에이전트: 1개 작업 남음

| 작업 | 파일 | 설명 | 예상 시간 |
|------|------|------|----------|
| 위젯 이메일 필수화 | `packages/core/src/widget.ts` | 이메일 필드 required 속성 추가 + 검증 | 30분 |

**구현 가이드:**

```typescript
// packages/core/src/widget.ts

// 1. 이메일 input에 required 추가
<input type="email" placeholder="Email" required />

// 2. 폼 제출 시 검증 로직 추가
if (!email || !email.includes('@')) {
  // 에러 메시지 표시
  return;
}

// 3. placeholder 변경
// Before: "Email (선택)"
// After: "Email"
```

### DBA: 할 일 없음 ✅

모든 스키마, 마이그레이션, 쿼리 함수가 구현 완료되었습니다.

### QA: 테스트 필요

- [ ] E2E 테스트: 고객 토큰 페이지 플로우
- [ ] E2E 테스트: Admin Reply → 고객 이메일 수신
- [ ] E2E 테스트: 고객 Reply → Admin 웹훅 수신
- [ ] 보안 테스트: XSS 입력 시도
- [ ] 성능 테스트: Rate limiting 동작 확인

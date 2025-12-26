# Sori 개발자 인수인계 문서

## 1. 프로젝트 개요

**Sori(소리)**는 웹 서비스를 위한 피드백 수집 SaaS입니다.

### 핵심 기능
- 고객 웹사이트에 임베드하는 경량 위젯 (3.2KB gzipped)
- 멀티테넌트 어드민 대시보드
- 피드백 상태 관리 (OPEN → IN_PROGRESS → RESOLVED)
- 웹훅 연동 지원 (Slack, Discord, Kakao)

### 타겟 시장
- 한국 시장 우선 (UI 한국어)
- 소규모 팀/스타트업

---

## 2. 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 패키지 매니저 | pnpm | 9.x |
| 모노레포 | Turborepo | 2.x |
| 프론트엔드 | React | 19.x |
| 프레임워크 | TanStack Start | 1.x |
| 라우팅 | TanStack Router | 1.x |
| 스타일링 | Tailwind CSS | 4.x |
| 빌드 | Vite | 7.x |
| ORM | Prisma | 7.x |
| 데이터베이스 | PostgreSQL | Supabase |
| 인증 | better-auth | 1.x |
| 서버 | Nitro | - |

---

## 3. 프로젝트 구조

```
sori/
├── apps/
│   ├── cdn/                    # 위젯 CDN (cdn.sori.life → S3 + CloudFront)
│   │   └── src/
│   │       ├── app.ts          # Hono 앱
│   │       ├── dev.ts          # 로컬 개발 서버
│   │       └── widget.ts       # GET /widget.js
│   │
│   └── web/                    # 어드민 + API (app.sori.life)
│       ├── src/
│       │   ├── routes/         # 페이지 라우트 (파일 기반)
│       │   │   ├── api/auth/   # better-auth 핸들러
│       │   │   ├── api/v1/feedback.ts  # 피드백 API
│       │   │   ├── admin.tsx   # 어드민 대시보드
│       │   │   ├── login.tsx   # 로그인
│       │   │   ├── signup.tsx  # 회원가입
│       │   │   ├── onboarding.tsx  # 조직 생성
│       │   │   └── organizations.tsx  # 조직 목록
│       │   ├── server/         # 서버 함수
│       │   │   ├── auth.ts     # 인증 관련
│       │   │   ├── feedback.ts # 피드백 CRUD
│       │   │   ├── organization.ts  # 조직 관리
│       │   │   ├── projects.ts # 프로젝트 관리
│       │   │   └── webhook.ts  # 웹훅 CRUD
│       │   ├── lib/            # 유틸리티
│       │   └── components/     # React 컴포넌트
│       └── vite.config.ts
│
├── packages/
│   ├── core/                   # 바닐라 JS 위젯
│   │   └── src/
│   │       ├── widget.ts       # 위젯 로직
│   │       ├── styles.ts       # CSS-in-JS
│   │       ├── api.ts          # API 통신
│   │       └── i18n.ts         # 다국어
│   │
│   ├── react/                  # React 래퍼
│   │   └── src/
│   │       ├── SoriWidget.tsx  # React 컴포넌트
│   │       └── useSori.ts      # React 훅
│   │
│   └── database/               # Prisma 패키지
│       ├── prisma/
│       │   └── schema.prisma   # DB 스키마
│       ├── src/
│       │   ├── client.ts       # PrismaClient 설정
│       │   └── index.ts        # 익스포트
│       └── generated/          # 생성된 클라이언트
│
└── tooling/
    └── tsconfig/               # 공유 TS 설정
```

---

## 4. 데이터베이스 스키마

### ERD 관계도

```
User (1) ←→ (N) OrganizationMember (N) ←→ (1) Organization
                                              │
                                              ├── (N) Project
                                              │       │
                                              │       └── (N) Feedback
                                              │
                                              ├── (N) Webhook
                                              │
                                              └── apiKey, webhookUrl (legacy)
```

### 주요 모델

#### User (Better Auth 관리)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  memberships   OrganizationMember[]
  sessions      Session[]
  accounts      Account[]
}
```

#### Organization (테넌트)
```prisma
model Organization {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique      # URL용 슬러그
  apiKey         String   @unique      # API 인증용
  webhookUrl     String?               # 웹훅 URL
  plan           Plan     @default(FREE)
  members        OrganizationMember[]
  projects       Project[]
}
```

#### OrganizationMember (N:N 관계)
```prisma
model OrganizationMember {
  id             String       @id
  role           MemberRole   @default(MEMBER)  # OWNER, ADMIN, MEMBER
  userId         String
  organizationId String
  @@unique([userId, organizationId])
}
```

#### Project (위젯 인스턴스)
```prisma
model Project {
  id             String       @id
  name           String
  allowedOrigins String[]     # CORS 허용 도메인
  widgetConfig   Json?        # 위젯 설정 (색상, 위치 등)
  organizationId String
  feedbacks      Feedback[]
}
```

#### Feedback (수집된 피드백)
```prisma
model Feedback {
  id         String         @id
  type       FeedbackType   # BUG, INQUIRY, FEATURE
  message    String
  email      String?
  status     FeedbackStatus @default(OPEN)
  priority   Priority?
  metadata   Json?          # URL, userAgent 등
  projectId  String
  createdAt  DateTime
  resolvedAt DateTime?
}
```

---

## 5. 인증 시스템

### Better Auth 설정

```typescript
// apps/web/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: { ... },
    github: { ... },
  },
});
```

### 인증 흐름
1. 회원가입 → `/signup` → Better Auth 처리 → `/onboarding`
2. 로그인 → `/login` → Better Auth 처리 → `/admin`
3. 조직 없으면 → `/onboarding`으로 리다이렉트

### 서버 함수에서 세션 확인
```typescript
import { getSession } from "@/server/auth";

const session = await getSession();
if (!session) {
  throw redirect({ to: "/login" });
}
```

---

## 6. API 엔드포인트

### Public API

#### GET cdn.sori.life/widget.js
위젯 JavaScript 반환

- URL: `https://cdn.sori.life/widget.js`
- Content-Type: `application/javascript`
- Cache: 1시간
- CORS: 모든 origin 허용

#### POST app.sori.life/api/v1/feedback
피드백 생성

- URL: `https://app.sori.life/api/v1/feedback`

```typescript
// Request
{
  projectId: string;    // 필수
  type: "BUG" | "INQUIRY" | "FEATURE";  // 필수
  message: string;      // 필수
  email?: string;
  metadata?: object;
}

// Response
{ success: true, id: string }
```

- CORS: Project의 `allowedOrigins` 확인
- 인증: 없음 (공개 API)
- Rate Limit: 분당 10회 (IP 기준)

### Internal API (어드민용)

TanStack Server Functions 사용:
- `getFeedbacks({ organizationId })`
- `updateFeedbackStatus({ id, status })`
- `createProject({ name, organizationId, allowedOrigins })`
- `getUserOrganizations({ userId })`

---

## 7. 위젯 시스템

### 임베드 코드

**한 줄로 설치:**
```html
<script src="https://cdn.sori.life/widget.js" data-project-id="PROJECT_ID"></script>
```

**커스터마이징:**
```html
<script
  src="https://cdn.sori.life/widget.js"
  data-project-id="PROJECT_ID"
  data-position="bottom-left"
  data-color="#10b981"
  data-text="피드백"
></script>
```

**지원하는 data 속성:**

| 속성 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `data-project-id` | O | - | 프로젝트 ID |
| `data-position` | X | `bottom-right` | 위치 (bottom-right, bottom-left, top-right, top-left) |
| `data-color` | X | `#4f46e5` | 테마 색상 (HEX) |
| `data-text` | X | `Feedback` | 버튼 텍스트 |
| `data-api-url` | X | `https://app.sori.life` | API URL (자동 감지) |

### 위젯 동작
1. 스크립트 로드 시 data 속성 또는 `window.SoriWidgetConfig` 읽기
2. CSS 인라인 주입
3. 플로팅 버튼 렌더링
4. 클릭 시 피드백 폼 표시
5. 제출 시 `app.sori.life/api/v1/feedback`로 POST

### 위젯 API
```javascript
window.SoriWidget.open()   // 위젯 열기
window.SoriWidget.close()  // 위젯 닫기
```

---

## 8. 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- pnpm 9+
- PostgreSQL (또는 Supabase 계정)

### 환경 변수 (.env)

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="32자 이상 랜덤 문자열"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth (선택)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### 초기 설정

```bash
# 1. 의존성 설치
pnpm install

# 2. DB 스키마 푸시
pnpm --filter @sori/database db:push

# 3. Prisma 클라이언트 생성
pnpm --filter @sori/database db:generate

# 4. 개발 서버 시작
pnpm dev
```

---

## 9. 주요 명령어

```bash
# 전체 개발
pnpm dev                  # 모든 패키지 watch 모드
pnpm build                # 전체 빌드

# 개별 패키지
pnpm --filter @sori/web dev      # 어드민 대시보드 (localhost:3000)
pnpm --filter @sori/cdn dev      # CDN 서버 (localhost:3001)
pnpm --filter @sori/core build
pnpm --filter @sori/database db:studio

# 데이터베이스
pnpm --filter @sori/database db:generate  # 클라이언트 재생성
pnpm --filter @sori/database db:push      # 스키마 푸시
pnpm --filter @sori/database db:migrate   # 마이그레이션

# 타입 체크
pnpm --filter @sori/web exec tsc --noEmit
pnpm --filter @sori/cdn exec tsc --noEmit
```

---

## 10. 웹훅 시스템

### 다중 웹훅 지원

조직당 여러 개의 웹훅을 등록할 수 있습니다. 플랜별 제한:

| 플랜 | 웹훅 수 |
|------|---------|
| FREE | 1개 |
| PRO | 5개 |
| TEAM | 10개 |
| ENTERPRISE | 50개 |

### Webhook 모델

```prisma
model Webhook {
  id             String       @id @default(cuid())
  name           String       // 예: "Slack - 개발팀"
  url            String
  type           WebhookType  @default(CUSTOM)
  enabled        Boolean      @default(true)
  organizationId String
  organization   Organization @relation(...)
}

enum WebhookType {
  SLACK
  DISCORD
  TELEGRAM
  CUSTOM
}
```

### 웹훅 타입 자동 감지

URL에서 서비스 타입을 자동으로 감지합니다:

```typescript
function detectWebhookType(url: string) {
  if (url.includes("hooks.slack.com")) return "SLACK";
  if (url.includes("discord.com/api/webhooks")) return "DISCORD";
  if (url.includes("api.telegram.org")) return "TELEGRAM";
  return "CUSTOM";
}
```

### 서비스별 페이로드 포맷

#### Slack (Block Kit)
```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "🔔 새 피드백" } },
    { "type": "section", "fields": [
      { "type": "mrkdwn", "text": "*유형:*\n🐛 버그 리포트" },
      { "type": "mrkdwn", "text": "*프로젝트:*\nMy App" }
    ]},
    { "type": "section", "text": { "type": "mrkdwn", "text": "*메시지:*\n버튼이 작동하지 않습니다" } }
  ]
}
```

#### Discord (Embeds)
```json
{
  "embeds": [{
    "title": "🔔 새 피드백",
    "color": 15548996,
    "fields": [
      { "name": "유형", "value": "🐛 버그 리포트", "inline": true },
      { "name": "프로젝트", "value": "My App", "inline": true },
      { "name": "메시지", "value": "버튼이 작동하지 않습니다" }
    ],
    "timestamp": "2025-01-01T00:00:00.000Z"
  }]
}
```

#### Telegram (HTML)
```json
{
  "text": "<b>🔔 새 피드백</b>\n\n🐛 <b>유형:</b> 버그 리포트\n📁 <b>프로젝트:</b> My App\n\n💬 <b>메시지:</b>\n버튼이 작동하지 않습니다",
  "parse_mode": "HTML"
}
```

#### Custom (JSON)
```json
{
  "event": "feedback.created",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "feedback": { "id": "...", "type": "BUG", "message": "..." },
  "project": { "id": "...", "name": "My App" },
  "organization": { "id": "...", "name": "My Org" }
}
```

### 웹훅 서버 함수

```typescript
// apps/web/src/server/webhook.ts
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhookById } from "@/server/webhook";

// 웹훅 목록 조회
await getWebhooks({ data: { organizationId } });

// 웹훅 생성 (플랜 제한 체크 포함)
await createWebhook({ data: { organizationId, name, url } });

// 웹훅 수정 (활성화/비활성화)
await updateWebhook({ data: { id, enabled: false } });

// 웹훅 삭제
await deleteWebhook({ data: { id } });

// 웹훅 테스트
await testWebhookById({ data: { webhookId } });
```

---

## 11. 보안

### Rate Limiting

피드백 API에 IP 기반 속도 제한이 적용됩니다:

```typescript
// 1분당 10개 요청 제한
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const RATE_LIMIT_MAX = 10;           // 최대 10개
```

### 입력값 검증

```typescript
const MAX_MESSAGE_LENGTH = 5000;   // 메시지 최대 길이
const MAX_EMAIL_LENGTH = 254;      // 이메일 최대 길이
const MAX_METADATA_SIZE = 10000;   // 메타데이터 최대 10KB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### CORS 설정

- Project의 `allowedOrigins` 배열로 허용 도메인 관리
- 와일드카드 서브도메인 지원: `*.example.com`
- 빈 배열이면 모든 도메인 허용

```typescript
// 올바른 CORS 처리
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some((allowed) => {
    if (allowed === "*" || allowed === origin) return true;
    if (allowed.startsWith("*.")) {
      const baseDomain = allowed.slice(2);
      const originHost = new URL(origin).hostname;
      return originHost === baseDomain || originHost.endsWith("." + baseDomain);
    }
    return false;
  });
}
```

### XSS 방지

위젯에서 사용자 입력 HTML 이스케이프:

```typescript
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

---

## 12. 배포

### 빌드 산출물

```bash
pnpm build
```

- `apps/web/.output/` - Nitro 서버 + 정적 자산
- `packages/core/dist/` - 위젯 번들
- `packages/react/dist/` - React 래퍼

### 환경별 설정
- `apiUrl`: 프로덕션에서는 실제 도메인으로 변경
- `DATABASE_URL`: 프로덕션 DB 연결 문자열
- `BETTER_AUTH_URL`: 프로덕션 URL

---

## 13. 알려진 이슈 및 해결책

### pnpm + Prisma 경로 문제
**문제**: pnpm의 격리된 store 구조로 인해 `@prisma/client`가 생성된 클라이언트를 찾지 못함

**해결**: `@sori/database` 패키지로 분리, tsup으로 번들링

### Vite SSR 번들링 문제
**문제**: Prisma 클라이언트가 CommonJS로 생성되어 ESM 번들링 시 오류

**해결**: `vite.config.ts`에서 external 처리
```typescript
ssr: {
  external: ['@sori/database', 'pg', '@prisma/adapter-pg', 'better-auth'],
}
```

### Better Auth 스키마 불일치
**문제**: Better Auth가 보내는 필드명과 Prisma 스키마 불일치

**해결**: Account 모델의 필드명을 Better Auth 규격에 맞춤
- `provider` → `providerId`
- `providerAccountId` → `accountId`

---

## 14. 향후 개발 계획

- [ ] OAuth 로그인 (Google, GitHub)
- [x] 웹훅 연동 (Slack, Discord, Telegram)
- [x] 다중 웹훅 지원 (플랜별 제한)
- [ ] 위젯 커스터마이징 UI
- [ ] 팀 멤버 초대 기능
- [ ] 요금제 관리
- [ ] 분석 대시보드

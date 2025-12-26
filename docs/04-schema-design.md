# 스키마 설계

## 기존 스키마 (마이그레이션 전)

```prisma
model Project {
  id        String     @id @default(uuid())
  name      String
  feedbacks Feedback[]
  createdAt DateTime   @default(now())
}

model Feedback {
  id        String   @id @default(uuid())
  type      String   // "BUG" | "INQUIRY"
  message   String
  email     String?
  status    String   @default("OPEN")
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  createdAt DateTime @default(now())
}
```

## 신규 스키마 (멀티테넌트)

SaaS 솔루션으로 전환하기 위해 멀티테넌트 구조 필요.

### ERD

```
┌─────────────────────┐
│   Organization      │
├─────────────────────┤
│ id            (pk)  │
│ name                │
│ slug          (uk)  │◄──────────────────┐
│ apiKey        (uk)  │                   │
│ webhookUrl?         │                   │
│ kakaoChannelId?     │                   │
│ plan                │                   │
│ locale              │                   │
│ createdAt           │                   │
└─────────┬───────────┘                   │
          │                               │
          │ 1:N                           │
          ▼                               │
┌─────────────────────┐                   │
│       User          │                   │
├─────────────────────┤                   │
│ id            (pk)  │                   │
│ email         (uk)  │                   │
│ name                │                   │
│ passwordHash        │                   │
│ role                │                   │
│ organizationId (fk) │───────────────────┘
│ createdAt           │
└─────────────────────┘

┌─────────────────────┐
│   Organization      │
└─────────┬───────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│      Project        │
├─────────────────────┤
│ id            (pk)  │
│ name                │
│ allowedOrigins[]    │◄── CORS 허용 도메인
│ organizationId (fk) │
│ widgetConfig  (json)│
│ createdAt           │
└─────────┬───────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│     Feedback        │
├─────────────────────┤
│ id            (pk)  │
│ type                │
│ message             │
│ email?              │
│ status              │
│ priority?           │
│ projectId     (fk)  │
│ metadata      (json)│
│ createdAt           │
│ resolvedAt?         │
└─────────────────────┘
```

### Prisma Schema (PostgreSQL)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Organization (고객사/테넌트)
// ============================================
model Organization {
  id             String    @id @default(uuid())
  name           String
  slug           String    @unique  // URL 식별자
  apiKey         String    @unique @default(uuid())  // 위젯 인증용
  webhookUrl     String?   // Slack/Discord/Custom
  kakaoChannelId String?   // 카카오 알림톡
  plan           Plan      @default(FREE)
  locale         Locale    @default(KO)

  users          User[]
  projects       Project[]

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

enum Plan {
  FREE
  PRO
  TEAM
  ENTERPRISE
}

enum Locale {
  KO
  EN
}

// ============================================
// User (관리자)
// ============================================
model User {
  id             String       @id @default(uuid())
  email          String       @unique
  name           String
  passwordHash   String?      // OAuth 사용 시 null
  role           UserRole     @default(MEMBER)

  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
}

// ============================================
// Project (사이트/앱)
// ============================================
model Project {
  id             String       @id @default(uuid())
  name           String
  allowedOrigins String[]     // CORS 허용 도메인
  widgetConfig   Json?        // 위젯 커스터마이징

  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  feedbacks      Feedback[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
}

// ============================================
// Feedback
// ============================================
model Feedback {
  id          String         @id @default(uuid())
  type        FeedbackType
  message     String
  email       String?
  status      FeedbackStatus @default(OPEN)
  priority    Priority?
  metadata    Json?          // url, userAgent, locale, timestamp

  project     Project        @relation(fields: [projectId], references: [id])
  projectId   String

  createdAt   DateTime       @default(now())
  resolvedAt  DateTime?

  @@index([projectId])
  @@index([status])
  @@index([createdAt])
}

enum FeedbackType {
  BUG
  INQUIRY
  FEATURE
}

enum FeedbackStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

## widgetConfig JSON 구조

```typescript
interface WidgetConfig {
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  primaryColor: string;      // e.g., "#4F46E5"
  greeting: string;          // e.g., "무엇을 도와드릴까요?"
  categories: string[];      // e.g., ["버그", "문의", "제안"]
  showEmail: boolean;        // 이메일 입력 필드 표시 여부
  emailRequired: boolean;    // 이메일 필수 여부
}
```

## metadata JSON 구조

```typescript
interface FeedbackMetadata {
  url: string;               // 피드백 보낸 페이지 URL
  userAgent: string;         // 브라우저 정보
  locale: string;            // e.g., "ko-KR"
  timestamp: string;         // ISO 8601
  screenSize?: string;       // e.g., "1920x1080"
  referrer?: string;         // 이전 페이지
}
```

## 인덱스 전략

| 테이블 | 인덱스 | 용도 |
|--------|--------|------|
| User | organizationId | 조직별 사용자 조회 |
| Project | organizationId | 조직별 프로젝트 조회 |
| Feedback | projectId | 프로젝트별 피드백 조회 |
| Feedback | status | 상태별 필터링 |
| Feedback | createdAt | 최신순 정렬 |

## 마이그레이션 계획

1. Supabase 프로젝트 생성
2. Prisma 7.x 업그레이드
3. 스키마 적용 (`prisma db push`)
4. 시드 데이터 생성

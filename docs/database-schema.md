# Database Schema

Sori 프로젝트의 PostgreSQL 데이터베이스 스키마 문서.

## 개요

### 테이블 구조
```
Better Auth 관련:
├── user          # 사용자
├── session       # 세션
├── account       # OAuth 계정
└── verification  # 이메일 인증

비즈니스 모델:
├── organization         # 조직 (테넌트)
├── organization_member  # 조직 멤버
├── project              # 프로젝트 (위젯 인스턴스)
├── feedback             # 피드백
├── reply                # 피드백 답변
└── webhook              # 웹훅 설정
```

---

## 전체 생성 SQL

아래 SQL을 Supabase SQL Editor에서 실행하면 전체 스키마가 생성됩니다.

```sql
-- ============================================
-- Enums
-- ============================================
CREATE TYPE "member_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "plan" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');
CREATE TYPE "locale" AS ENUM ('KO', 'EN');
CREATE TYPE "feedback_type" AS ENUM ('BUG', 'INQUIRY', 'FEATURE');
CREATE TYPE "feedback_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "webhook_type" AS ENUM ('SLACK', 'DISCORD', 'TELEGRAM', 'CUSTOM');
CREATE TYPE "author_type" AS ENUM ('USER', 'ADMIN', 'API');

-- ============================================
-- Better Auth 테이블
-- ============================================
CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT,
  "image" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "access_token_expires_at" TIMESTAMPTZ,
  "refresh_token_expires_at" TIMESTAMPTZ,
  "scope" TEXT,
  "password" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

CREATE TABLE "verification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 비즈니스 모델
-- ============================================
CREATE TABLE "organization" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "api_key" TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "webhook_url" TEXT,
  "kakao_channel_id" TEXT,
  "plan" "plan" NOT NULL DEFAULT 'FREE',
  "locale" "locale" NOT NULL DEFAULT 'KO',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "organization_member" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "role" "member_role" NOT NULL DEFAULT 'MEMBER',
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "organization_id" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("user_id", "organization_id")
);
CREATE INDEX "org_member_user_id_idx" ON "organization_member"("user_id");
CREATE INDEX "org_member_org_id_idx" ON "organization_member"("organization_id");

CREATE TABLE "project" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "allowed_origins" TEXT[] DEFAULT '{}',
  "widget_config" JSONB,
  "organization_id" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "api_key" TEXT UNIQUE,
  "api_key_created_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "project_org_id_idx" ON "project"("organization_id");

CREATE TABLE "feedback" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "feedback_type" NOT NULL,
  "message" TEXT NOT NULL,
  "email" TEXT,
  "status" "feedback_status" NOT NULL DEFAULT 'OPEN',
  "priority" "priority",
  "metadata" JSONB,
  "project_id" TEXT NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resolved_at" TIMESTAMPTZ
);
CREATE INDEX "feedback_project_id_idx" ON "feedback"("project_id");
CREATE INDEX "feedback_status_idx" ON "feedback"("status");
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");

CREATE TABLE "reply" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "content" TEXT NOT NULL,
  "feedback_id" TEXT NOT NULL REFERENCES "feedback"("id") ON DELETE CASCADE,
  "author_id" TEXT,
  "author_name" TEXT,
  "author_type" "author_type" NOT NULL DEFAULT 'ADMIN',
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "reply_feedback_id_idx" ON "reply"("feedback_id");

CREATE TABLE "webhook" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" "webhook_type" NOT NULL DEFAULT 'CUSTOM',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "organization_id" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "webhook_org_id_idx" ON "webhook"("organization_id");
```

---

## Enums

| Enum | 값 | 설명 |
|------|-----|------|
| `member_role` | OWNER, ADMIN, MEMBER | 조직 멤버 역할 |
| `plan` | FREE, PRO, TEAM, ENTERPRISE | 요금제 |
| `locale` | KO, EN | 언어 |
| `feedback_type` | BUG, INQUIRY, FEATURE | 피드백 유형 |
| `feedback_status` | OPEN, IN_PROGRESS, RESOLVED, CLOSED | 피드백 상태 |
| `priority` | LOW, MEDIUM, HIGH, URGENT | 우선순위 |
| `webhook_type` | SLACK, DISCORD, TELEGRAM, CUSTOM | 웹훅 유형 |
| `author_type` | USER, ADMIN, API | 답변 작성자 유형 |

---

## 테이블 상세

### user (Better Auth)

사용자 정보. Better Auth에서 관리.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 사용자 ID |
| email | TEXT (UNIQUE) | 이메일 |
| email_verified | BOOLEAN | 이메일 인증 여부 |
| name | TEXT | 이름 |
| image | TEXT | 프로필 이미지 URL |
| created_at | TIMESTAMPTZ | 생성일 |
| updated_at | TIMESTAMPTZ | 수정일 |

### session (Better Auth)

사용자 세션.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 세션 ID |
| token | TEXT (UNIQUE) | 세션 토큰 |
| expires_at | TIMESTAMPTZ | 만료 시간 |
| ip_address | TEXT | IP 주소 |
| user_agent | TEXT | User Agent |
| user_id | TEXT (FK) | 사용자 ID |

### account (Better Auth)

OAuth 계정 연결.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 계정 ID |
| account_id | TEXT | 외부 계정 ID |
| provider_id | TEXT | 제공자 (google, github 등) |
| user_id | TEXT (FK) | 사용자 ID |
| access_token | TEXT | 액세스 토큰 |
| refresh_token | TEXT | 리프레시 토큰 |
| password | TEXT | 비밀번호 (credential 방식) |

### verification (Better Auth)

이메일 인증 토큰.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | ID |
| identifier | TEXT | 식별자 (이메일) |
| token | TEXT | 인증 토큰 |
| expires_at | TIMESTAMPTZ | 만료 시간 |

### organization

조직 (테넌트).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 조직 ID |
| name | TEXT | 조직 이름 |
| slug | TEXT (UNIQUE) | URL slug |
| api_key | TEXT (UNIQUE) | API 키 |
| webhook_url | TEXT | 레거시 웹훅 URL |
| kakao_channel_id | TEXT | 카카오 채널 ID |
| plan | plan | 요금제 |
| locale | locale | 언어 설정 |

### organization_member

조직 멤버십.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | ID |
| role | member_role | 역할 |
| user_id | TEXT (FK) | 사용자 ID |
| organization_id | TEXT (FK) | 조직 ID |

### project

프로젝트 (위젯 인스턴스).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 프로젝트 ID |
| name | TEXT | 프로젝트 이름 |
| allowed_origins | TEXT[] | 허용 도메인 목록 |
| widget_config | JSONB | 위젯 설정 |
| organization_id | TEXT (FK) | 조직 ID |
| api_key | TEXT (UNIQUE) | 프로젝트 API 키 |
| api_key_created_at | TIMESTAMPTZ | API 키 생성일 |

### feedback

수집된 피드백.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 피드백 ID |
| type | feedback_type | 피드백 유형 |
| message | TEXT | 내용 |
| email | TEXT | 제출자 이메일 |
| status | feedback_status | 상태 |
| priority | priority | 우선순위 |
| metadata | JSONB | 메타데이터 (브라우저 정보 등) |
| project_id | TEXT (FK) | 프로젝트 ID |
| resolved_at | TIMESTAMPTZ | 해결 시간 |

### reply

피드백 답변.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 답변 ID |
| content | TEXT | 내용 |
| feedback_id | TEXT (FK) | 피드백 ID |
| author_id | TEXT | 작성자 ID |
| author_name | TEXT | 작성자 이름 |
| author_type | author_type | 작성자 유형 |
| is_internal | BOOLEAN | 내부 메모 여부 |

### webhook

다중 웹훅 설정.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT (PK) | 웹훅 ID |
| name | TEXT | 이름 (예: "Slack - 개발팀") |
| url | TEXT | 웹훅 URL |
| type | webhook_type | 웹훅 유형 |
| enabled | BOOLEAN | 활성화 여부 |
| organization_id | TEXT (FK) | 조직 ID |

---

## 관계도

```
user 1──N session
user 1──N account
user 1──N organization_member

organization 1──N organization_member
organization 1──N project
organization 1──N webhook

project 1──N feedback

feedback 1──N reply
```

---

## 전체 삭제 SQL

기존 스키마를 모두 삭제할 때 사용합니다.

```sql
-- 테이블 삭제 (의존성 순서대로)
DROP TABLE IF EXISTS "reply" CASCADE;
DROP TABLE IF EXISTS "feedback" CASCADE;
DROP TABLE IF EXISTS "webhook" CASCADE;
DROP TABLE IF EXISTS "project" CASCADE;
DROP TABLE IF EXISTS "organization_member" CASCADE;
DROP TABLE IF EXISTS "organization" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Enum 삭제
DROP TYPE IF EXISTS "author_type" CASCADE;
DROP TYPE IF EXISTS "webhook_type" CASCADE;
DROP TYPE IF EXISTS "priority" CASCADE;
DROP TYPE IF EXISTS "feedback_status" CASCADE;
DROP TYPE IF EXISTS "feedback_type" CASCADE;
DROP TYPE IF EXISTS "locale" CASCADE;
DROP TYPE IF EXISTS "plan" CASCADE;
DROP TYPE IF EXISTS "member_role" CASCADE;
```

---

## 참고

- ID는 `gen_random_uuid()` 사용
- 타임스탬프는 TIMESTAMPTZ (timezone-aware)
- JSON 필드는 JSONB 타입 사용
- 배열 필드 (`allowed_origins`)는 PostgreSQL TEXT[] 사용

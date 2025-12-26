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
└── webhook              # 웹훅 설정
```

---

## Enums

```sql
-- 멤버 역할
CREATE TYPE member_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- 요금제
CREATE TYPE plan AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');

-- 언어
CREATE TYPE locale AS ENUM ('KO', 'EN');

-- 피드백 타입
CREATE TYPE feedback_type AS ENUM ('BUG', 'INQUIRY', 'FEATURE');

-- 피드백 상태
CREATE TYPE feedback_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- 우선순위
CREATE TYPE priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- 웹훅 타입
CREATE TYPE webhook_type AS ENUM ('SLACK', 'DISCORD', 'TELEGRAM', 'CUSTOM');
```

---

## 테이블 정의

### user (Better Auth)

사용자 정보. Better Auth에서 관리.

```sql
CREATE TABLE "user" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email           TEXT UNIQUE NOT NULL,
  email_verified  BOOLEAN DEFAULT false,
  name            TEXT,
  image           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### session (Better Auth)

사용자 세션.

```sql
CREATE TABLE session (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_session_user_id ON session(user_id);
```

### account (Better Auth)

OAuth 계정 연결.

```sql
CREATE TABLE account (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id              TEXT NOT NULL,
  provider_id             TEXT NOT NULL,
  user_id                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token            TEXT,
  refresh_token           TEXT,
  id_token                TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                   TEXT,
  password                TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_account_user_id ON account(user_id);
```

### verification (Better Auth)

이메일 인증 토큰.

```sql
CREATE TABLE verification (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE(identifier, token)
);
```

### organization

조직 (테넌트).

```sql
CREATE TABLE organization (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  api_key          TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  webhook_url      TEXT,                          -- Legacy: 단일 웹훅 (하위 호환)
  kakao_channel_id TEXT,
  plan             plan DEFAULT 'FREE',
  locale           locale DEFAULT 'KO',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

### webhook

다중 웹훅 설정.

```sql
CREATE TABLE webhook (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,                  -- 예: "Slack - 개발팀"
  url             TEXT NOT NULL,
  type            webhook_type DEFAULT 'CUSTOM',
  enabled         BOOLEAN DEFAULT true,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_organization_id ON webhook(organization_id);
```

### organization_member

조직 멤버십.

```sql
CREATE TABLE organization_member (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role            member_role DEFAULT 'MEMBER',
  user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_org_member_user_id ON organization_member(user_id);
CREATE INDEX idx_org_member_org_id ON organization_member(organization_id);
```

### project

프로젝트 (위젯 인스턴스).

```sql
CREATE TABLE project (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  allowed_origins TEXT[] DEFAULT '{}',
  widget_config   JSONB,
  organization_id TEXT NOT NULL REFERENCES organization(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_organization_id ON project(organization_id);
```

### feedback

수집된 피드백.

```sql
CREATE TABLE feedback (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        feedback_type NOT NULL,
  message     TEXT NOT NULL,
  email       TEXT,
  status      feedback_status DEFAULT 'OPEN',
  priority    priority,
  metadata    JSONB,
  project_id  TEXT NOT NULL REFERENCES project(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_feedback_project_id ON feedback(project_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
```

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
```

---

## 참고

- ID는 모두 CUID (Prisma에서 사용하던 형식 유지)
- 타임스탬프는 TIMESTAMPTZ (timezone-aware)
- JSON 필드는 JSONB 타입 사용
- 배열 필드 (`allowed_origins`)는 PostgreSQL TEXT[] 사용

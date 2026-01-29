# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 코딩 원칙

### SOLID 원칙

- **SRP (단일 책임)**: 한 모듈/클래스/함수는 하나의 역할만 담당
- **OCP (개방-폐쇄)**: 확장에는 열려있고, 수정에는 닫혀있게 설계
- **DIP (의존성 역전)**: 구체 클래스가 아닌 인터페이스에 의존

### 함수 설계

- 함수는 20줄 이내로 유지
- 한 함수는 한 가지 일만 수행
- 부수효과(side effect) 최소화
- 순수 함수 선호

### 디자인 패턴

- 여러 구현체가 예상되면 Strategy 패턴 적용
- 객체 생성 로직이 복잡하면 Factory 패턴 적용
- 설정/매핑 데이터는 하드코딩 대신 별도 파일로 분리

### 규칙

- 관련 기능은 폴더로 그룹화 (flat 구조 지양)
- index.ts로 public API만 노출, 내부 구현은 숨김
- 타입은 types.ts에 모아서 관리

## 테스트

- 새 모듈 작성 시 테스트 용이성 고려
- 외부 의존성(DB, API, 파일시스템)은 주입 가능하게 설계
- 핵심 로직은 순수 함수로 분리하여 단위 테스트 용이하게

## 타입 & 검증

- Zod 스키마로 타입 정의 + 런타임 검증 통합
- `z.infer<>`로 타입 추론
- API 입력값은 반드시 Zod로 검증

## 네이밍

- 파일명: kebab-case (`token-estimator.ts`)
- 클래스/타입: PascalCase (`TokenEstimator`)
- 함수/변수: camelCase (`estimateTokens`)
- 상수: UPPER_SNAKE_CASE (`MAX_TOKEN_LIMIT`)

## 커밋

- Conventional Commits 형식 사용
- `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

## 린트

- ESLint 사용
- Prettier 사용

## Project Overview

Sori (소리 - "Voice") is a SaaS feedback collection solution. It provides a lightweight embeddable widget for customer websites and an admin dashboard for managing feedback.

## Commands

```bash
# Development
pnpm install          # Install all dependencies
pnpm dev              # Start all packages in watch mode
pnpm build            # Build all packages

# Single package development
pnpm --filter @sori/web dev       # Run only web app
pnpm --filter @sori/core build    # Build only core widget
```

## Architecture

### Monorepo Structure

```
packages/
├── core/       # Vanilla JS widget (zero dependencies, 3.2KB gzipped)
├── react/      # React wrapper for @sori/core
└── database/   # PostgreSQL client (pg + raw SQL, Zod schemas)

apps/
├── cdn/        # Widget CDN - cdn.sori.life (Cloudflare Pages, static only)
└── web/        # Admin + API - web.sori.life (TanStack Start + React 19)
```

### Tech Stack

- **Frontend**: React 19, TanStack Start/Router, Tailwind CSS, Vite
- **Backend**: TanStack Server Functions, better-auth
- **Database**: pg (node-postgres) + raw SQL with PostgreSQL (Supabase)
- **Build**: pnpm workspaces, Turborepo, tsup

### Multi-tenant Model

```
Organization (tenant)
├── OrganizationMember (user roles: OWNER/ADMIN/MEMBER)
├── Project (widget instances with allowed origins)
│   └── Feedback (collected from widget)
```

### Key Files

- `packages/database/src/schemas/` - Zod schemas for validation
- `packages/database/src/queries/` - SQL query functions
- `apps/web/src/routes/` - Page routes (TanStack Router file-based routing)
- `apps/web/src/routes/api/v1/feedback.ts` - Feedback submission API
- `apps/web/src/server/` - Server functions (auth, feedback, organization, projects)
- `apps/cdn/src/widget.ts` - Widget script (static)

### Widget Integration

The widget is served from `cdn.sori.life/widget.js` and submits to `web.sori.life/api/v1/feedback`.

```html
<script
  src="https://cdn.sori.life/widget.js"
  data-project-id="PROJECT_ID"
></script>
```

## Database

Uses `pg` (node-postgres) with raw SQL queries:

```typescript
import { query, queryOne } from "@sori/database";

const users = await query<User>("SELECT * FROM users WHERE org_id = $1", [orgId]);
```

The `@sori/database` package exports query helpers, Zod schemas, and TypeScript types.

## SSR Configuration

`@sori/database`, `pg`, and `better-auth` are marked as SSR externals in Vite config to avoid bundling issues.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 기본 원칙

- **계획 먼저, 코드는 나중**: 구현 전 설계/선택지/리스크 정리 후 승인받기
- **유지보수성 우선**: 혼자 운영 가능한 수준의 복잡도 유지
- **커밋은 요청 시에만**: 자동 커밋 금지

## 역할 정의

너는 시니어 풀스택 엔지니어 + 아키텍트 역할이다.

## 작업 흐름

### 1. 설계 단계

기능 구현 전 아래 항목 정리:

| 항목   | 내용                     |
| ------ | ------------------------ |
| 선택지 | 가능한 접근 방식들       |
| 장단점 | 각 선택지별 트레이드오프 |
| 추천안 | 프로젝트 맥락에서 최선   |

필수 고려사항:
- 데이터 구조
- 트랜잭션 / 일관성
- 확장 시 병목
- 유지보수 부담

### 2. 구현 단계

조건:

- 가독성 > 코드 길이
- 추상화는 꼭 필요할 때만
- 함수/모듈 책임 명확

추가 설명:

- 구조 선택 이유
- 변경 가능성 높은 지점 표시

### 3. 리뷰 관점

1. 운영 중 장애 가능성
2. 트래픽 증가 시 병목
3. 보안 / 권한 리스크
4. 3개월 후 문제될 포인트
5. 리팩터링 우선순위

---

## 코딩 원칙

### 공통

- 기존 코드 패턴/컨벤션 따르기
- 불필요한 복잡도 추가 금지
- 타입 안전성 확보

### 프론트엔드 (React/TypeScript)

- 타입 정의는 Zod 스키마 필수 (런타임 검증)
- API 응답, 폼 데이터 등 외부 데이터는 Zod로 파싱
- 스키마는 `schemas/` 폴더에 작성
- 불필요한 리렌더링 주의

### 백엔드

- API 응답 형식 일관성 유지
- 에러 핸들링 명확하게
- 민감 정보 로깅 금지

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

## 문서화 (마무리)

기능 완료 후 정리:

- 이 기능의 존재 이유
- 핵심 설계 결정 3가지
- 절대 건드리면 안 되는 부분
- 바꿔도 되는 부분

---

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

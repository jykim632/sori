# Contributing to Sori

Sori 프로젝트 기여 가이드입니다.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or Supabase account)

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/sori.git
cd sori

# Install dependencies
pnpm install

# Copy environment variables
cp apps/web/.env.example apps/web/.env

# Set up your database URL in .env
# DATABASE_URL="postgresql://..."

# Push database schema
pnpm db:push

# Start development
pnpm dev
```

## 브랜치 전략

```
main        ← 프로덕션 (배포용)
develop     ← 개발 통합 브랜치
feature/*   ← 기능 개발
fix/*       ← 버그 수정
```

### 규칙

- `main`: 직접 push 금지, PR을 통해서만 머지
- `develop`: 기능 개발 완료 후 PR
- 새 작업 시 `develop`에서 브랜치 생성:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/기능명
```

## 이슈 관리

### 이슈 생성

1. 기존 이슈 중 중복 확인
2. 적절한 템플릿 선택 (Feature / Bug)
3. Labels 지정

### Labels

| Label | 설명 |
|-------|------|
| `type: feature` | 새 기능 |
| `type: bug` | 버그 수정 |
| `type: refactor` | 리팩토링 |
| `type: docs` | 문서 |
| `type: chore` | 설정, 의존성 등 |
| `scope: web` | apps/web |
| `scope: cdn` | apps/cdn |
| `scope: core` | packages/core |
| `scope: database` | packages/database |
| `priority: high` | 긴급 |
| `priority: medium` | 보통 |
| `priority: low` | 낮음 |

## 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다.

### 형식

```
<type>(<scope>): <description>

[body]
```

### Type

| Type | 설명 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `docs` | 문서 수정 |
| `chore` | 빌드, 설정 등 |
| `test` | 테스트 추가/수정 |

### Scope (선택)

`web`, `cdn`, `core`, `database`, `widget`, `auth` 등

### 예시

```bash
feat(widget): 다크모드 지원 추가
fix(web): 로그인 리다이렉트 오류 수정
refactor(core): 이벤트 핸들러 구조 개선
docs: README 업데이트
chore: 의존성 업데이트
```

## Pull Request

### PR 생성 전

1. 관련 이슈 확인 (없으면 먼저 이슈 생성)
2. `develop` 브랜치 최신화
3. 빌드 확인: `pnpm build`

### PR 규칙

- 제목: 커밋 메시지와 동일한 형식
- 본문: PR 템플릿 작성
- 관련 이슈 연결: `Closes #123`

### 머지 조건

- 코드 리뷰 승인
- 빌드 성공
- 충돌 해결

## Project Structure

```
packages/
├── core/       # Widget (vanilla JS) - keep it lightweight!
├── react/      # React wrapper
└── database/   # Prisma schema and client

apps/
├── cdn/        # Widget CDN
└── web/        # Admin dashboard
```

## Guidelines

### Widget (`@sori/core`)

- **No dependencies** - This is a hard rule
- **Bundle size matters** - Every byte counts
- Keep it under 5KB gzipped

### Dashboard (`apps/web`)

- Use TanStack Router for routing
- Server functions go in `src/server/`
- Follow existing patterns

## Code Style

- We use Prettier for formatting
- TypeScript strict mode is enabled
- Prefer explicit types over inference for public APIs

## License

By submitting a pull request, you agree that your contribution is licensed under the Apache License 2.0 and that you grant a perpetual, worldwide, non-exclusive license to the project maintainers and Sori.

Please read our [Contributor License Agreement (CLA)](./CLA.md) for full details.

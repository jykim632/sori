# Contributing to Sori

Thank you for your interest in contributing to Sori!

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

## Development Workflow

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add webhook support for Discord
fix: resolve widget z-index issue
docs: update installation guide
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `pnpm test`
4. Run type check: `pnpm typecheck`
5. Submit a PR with a clear description

## Project Structure

```
packages/
├── core/       # Widget (vanilla JS) - keep it lightweight!
├── react/      # React wrapper
└── database/   # Prisma schema and client

apps/
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

## Questions?

- Open a [GitHub Issue](https://github.com/your-org/sori/issues)
- Join our [Discord](https://discord.gg/sori)

## License

By submitting a pull request, you agree that your contribution is licensed under the Apache License 2.0 and that you grant a perpetual, worldwide, non-exclusive license to the project maintainers and Sori.

Please read our [Contributor License Agreement (CLA)](./CLA.md) for full details.

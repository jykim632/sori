# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sori (소리 - "Voice") is a SaaS feedback collection solution. It provides a lightweight embeddable widget for customer websites and an admin dashboard for managing feedback.

## Commands

```bash
# Development
pnpm install          # Install all dependencies
pnpm dev              # Start all packages in watch mode
pnpm build            # Build all packages

# Database (run from packages/database or use --filter)
pnpm db:generate      # Generate Prisma client + rebuild package
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Single package development
pnpm --filter @sori/web dev       # Run only web app
pnpm --filter @sori/core build    # Build only core widget
pnpm --filter @sori/database db:push  # Push database schema
```

## Architecture

### Monorepo Structure

```
packages/
├── core/       # Vanilla JS widget (zero dependencies, 3.2KB gzipped)
├── react/      # React wrapper for @sori/core
└── database/   # Prisma ORM + PostgreSQL client

apps/
└── web/        # Admin dashboard (TanStack Start + React 19)
```

### Tech Stack

- **Frontend**: React 19, TanStack Start/Router, Tailwind CSS, Vite
- **Backend**: TanStack Server Functions, better-auth
- **Database**: Prisma 7.x with PostgreSQL (Supabase)
- **Build**: pnpm workspaces, Turborepo, tsup

### Multi-tenant Model

```
Organization (tenant)
├── OrganizationMember (user roles: OWNER/ADMIN/MEMBER)
├── Project (widget instances with allowed origins)
│   └── Feedback (collected from widget)
```

### Key Files

- `packages/database/prisma/schema.prisma` - Database schema
- `apps/web/src/routes/` - Page routes (TanStack Router file-based routing)
- `apps/web/src/server/` - Server functions (auth, feedback, organization, projects)
- `apps/web/src/routes/api/v1/` - Public API endpoints (feedback submission, widget script)

### Widget Integration

The widget is served from `/api/v1/widget` and submits to `/api/v1/feedback`. Customer integration:

```html
<script>
window.SoriWidgetConfig = { projectId: 'PROJECT_ID', apiUrl: 'https://sori.io' };
</script>
<script src="https://sori.io/api/v1/widget"></script>
```

## Database

Uses Prisma with driver adapter pattern for Supabase pooled connections:

```typescript
import { prisma } from "@sori/database";
```

The `@sori/database` package exports both the prisma client and all Prisma types.

## SSR Configuration

`@sori/database`, `pg`, `@prisma/adapter-pg`, and `better-auth` are marked as SSR externals in Vite config to avoid bundling issues.

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
├── cdn/        # Widget CDN - cdn.sori.life (S3 + CloudFront, static only)
└── web/        # Admin + API - app.sori.life (TanStack Start + React 19)
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
- `apps/web/src/routes/api/v1/feedback.ts` - Feedback submission API
- `apps/web/src/server/` - Server functions (auth, feedback, organization, projects)
- `apps/cdn/src/widget.ts` - Widget script (static)

### Widget Integration

The widget is served from `cdn.sori.life/widget.js` and submits to `app.sori.life/api/v1/feedback`.

```html
<script src="https://cdn.sori.life/widget.js" data-project-id="PROJECT_ID"></script>
```

## Database

Uses Prisma with driver adapter pattern for Supabase pooled connections:

```typescript
import { prisma } from "@sori/database";
```

The `@sori/database` package exports both the prisma client and all Prisma types.

## SSR Configuration

`@sori/database`, `pg`, `@prisma/adapter-pg`, and `better-auth` are marked as SSR externals in Vite config to avoid bundling issues.

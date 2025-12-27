<p align="center">
  <h1 align="center">Sori</h1>
  <p align="center">
    <strong>3KB로 끝나는 피드백 수집</strong>
    <br />
    The lightest feedback widget. Zero dependencies. One line install.
  </p>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#features">Features</a> •
  <a href="#self-hosting">Self-Hosting</a> •
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/gzip-3.2KB-brightgreen" alt="Bundle Size" />
  <img src="https://img.shields.io/badge/dependencies-0-blue" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="Apache 2.0 License" />
</p>

---

## Why Sori?

| | Sori | Gleap | Canny | Hotjar |
|---|:---:|:---:|:---:|:---:|
| **Bundle Size** | **3.2KB** | ~200KB | ~150KB | ~100KB |
| **Dependencies** | **0** | Many | Many | Many |
| **Open Source** | **Yes** | No | No | No |
| **Free Tier** | **Yes** | Limited | No | Limited |
| **Self-Hostable** | **Yes** | No | No | No |

## Installation

### Option 1: Script Tag (Recommended)

```html
<script
  src="https://your-domain.com/api/v1/widget"
  data-project="YOUR_PROJECT_ID"
  defer
></script>
```

That's it. No build step. No configuration.

### Option 2: npm

```bash
npm install @sori/core
# or
pnpm add @sori/core
```

```javascript
import { SoriWidget } from '@sori/core'

SoriWidget.init({
  projectId: 'YOUR_PROJECT_ID',
  apiUrl: 'https://your-domain.com'
})
```

### Option 3: React

```bash
npm install @sori/react
```

```tsx
import { SoriWidget } from '@sori/react'

function App() {
  return (
    <>
      <YourApp />
      <SoriWidget projectId="YOUR_PROJECT_ID" />
    </>
  )
}
```

## Usage

### Basic

The widget appears as a floating button in the bottom-right corner. Click to open the feedback form.

### Feedback Types

Users can submit three types of feedback:
- **Bug** - Something isn't working
- **Feature** - Request a new feature
- **Inquiry** - General question

### Customization

```javascript
SoriWidget.init({
  projectId: 'YOUR_PROJECT_ID',
  position: 'bottom-right', // or 'bottom-left'
  primaryColor: '#6366f1',
  locale: 'en' // or 'ko'
})
```

## Features

- **Lightweight** - 3.2KB gzipped, loads instantly
- **Zero Dependencies** - Pure vanilla JavaScript
- **Lazy Loading** - Form loads only when clicked
- **Mobile Friendly** - Responsive design
- **Accessible** - Keyboard navigable, screen reader friendly
- **Customizable** - Colors, position, locale

## Admin Dashboard

Manage feedback through the admin dashboard:

- View all feedback in one place
- Filter by status, type, project
- Update status (Open → In Progress → Resolved)
- Webhook notifications (Slack, Discord, Telegram)

## Self-Hosting

### Requirements

- Node.js 20+
- PostgreSQL (Supabase recommended)
- pnpm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/sori.git
cd sori

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env
# Edit .env with your database URL

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Docker

```bash
docker-compose up -d
```

## Project Structure

```
sori/
├── packages/
│   ├── core/       # Vanilla JS widget (MIT)
│   ├── react/      # React wrapper (MIT)
│   └── database/   # Prisma client
└── apps/
    └── web/        # Admin dashboard
```

## Tech Stack

- **Widget**: Vanilla JavaScript, zero dependencies
- **Dashboard**: React 19, TanStack Start, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: better-auth

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Build all packages
pnpm build
```

## License

This project is licensed under the [Apache License 2.0](./LICENSE).

## Links

- [Documentation](https://docs.sori.io)
- [Discord Community](https://discord.gg/sori)
- [Twitter](https://twitter.com/sori_feedback)

---

<p align="center">
  Made with ❤️ in Korea
</p>

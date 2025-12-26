# 아키텍처

## 시스템 개요

```
┌─────────────────────────────────────────────────────────┐
│  고객사 웹사이트                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                            [?]      │ │
│  │                                         피드백 UI   │ │
│  └─────────────────────────────────────────────────────┘ │
│                    ▲                                     │
│                    │ <script src="cdn.sori.life/widget.js">
└────────────────────┼────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐    ┌───────────────────────────────┐
│ cdn.sori.life     │    │ app.sori.life (TanStack Start) │
│ (S3 + CloudFront) │    │ ├── POST /api/v1/feedback     │
│ └── /widget.js    │    │ └── 어드민 대시보드             │
└───────────────────┘    └───────────────────────────────┘
                                      │
                                      ▼ Prisma
                         ┌─────────────────────────────────┐
                         │  Supabase (PostgreSQL)          │
                         └─────────────────────────────────┘
                                      │
                                      ▼ Webhook (optional)
                         ┌─────────────────────────────────┐
                         │  Slack, Discord, Telegram       │
                         └─────────────────────────────────┘
```

## 모노레포 구조

```
sori/
├── package.json              # 루트 (turbo, pnpm)
├── pnpm-workspace.yaml       # 워크스페이스 정의
├── turbo.json                # Turborepo 설정
│
├── apps/                     # 애플리케이션
│   ├── cdn/                  # 위젯 CDN (cdn.sori.life → S3 + CloudFront)
│   │   ├── package.json      # @sori/cdn
│   │   └── src/
│   │       ├── app.ts        # Hono 앱
│   │       └── widget.ts     # GET /widget.js (정적 빌드용)
│   │
│   └── web/                  # 어드민 대시보드 + API (app.sori.life)
│       ├── package.json      # @sori/web
│       ├── vite.config.ts
│       └── src/
│           ├── routes/
│           │   └── api/v1/feedback.ts  # 피드백 API
│           ├── server/
│           ├── components/
│           └── lib/
│
├── packages/                 # 라이브러리 패키지
│   ├── core/                 # Vanilla JS 위젯
│   │   └── src/
│   │       ├── widget.ts     # 위젯 로직
│   │       ├── styles.ts     # CSS-in-JS
│   │       └── api.ts        # API 통신
│   │
│   ├── react/                # React wrapper
│   │   └── src/
│   │       ├── SoriWidget.tsx
│   │       └── useSori.ts
│   │
│   └── database/             # Prisma ORM
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           └── client.ts
│
└── tooling/
    └── tsconfig/             # 공유 TypeScript 설정
```

## 기술 스택

### Frontend
| 기술 | 용도 | 버전 |
|------|------|------|
| React | UI 라이브러리 | 19.x |
| TanStack Start | 풀스택 프레임워크 | 1.x |
| TanStack Router | 라우팅 | 1.x |
| Tailwind CSS | 스타일링 | 4.x |
| Vite | 빌드 도구 | 7.x |

### Backend
| 기술 | 용도 | 버전 |
|------|------|------|
| TanStack Server Functions | API | - |
| Prisma | ORM | 7.x (예정) |
| Supabase | 데이터베이스 | - |
| PostgreSQL | DB 엔진 | 15.x |

### 빌드/배포
| 기술 | 용도 |
|------|------|
| pnpm | 패키지 매니저 |
| Turborepo | 모노레포 빌드 |
| tsup | 라이브러리 번들링 |
| Nitro | 서버 빌드 |

## 패키지 의존성

```
@sori/tsconfig (공유 설정)
       ▲
       │
┌──────┴──────┐
│             │
@sori/core    @sori/web
       │          │
       ▼          │
@sori/react ──────┘
```

## 빌드 출력

### @sori/core
```
dist/
├── index.js      # ESM (npm import용)
├── index.cjs     # CommonJS
├── index.d.ts    # 타입 정의
├── cdn.js        # IIFE (CDN script 태그용)
└── cdn.d.ts
```

### @sori/react
```
dist/
├── index.js      # ESM
├── index.cjs     # CommonJS
└── index.d.ts    # 타입 정의
```

### @sori/web
```
.output/
├── public/       # 정적 파일
│   └── assets/
└── server/       # Nitro 서버
    └── index.mjs
```

## 번들 크기

| 패키지 | 원본 | Gzipped |
|--------|------|---------|
| @sori/core (CDN) | 8.5KB | **3.2KB** |
| @sori/react | 753B | ~300B |
| @sori/web (main.js) | 308KB | 98KB |

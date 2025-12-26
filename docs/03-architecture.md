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
│                    │ @sori/core (3.2KB gzipped)          │
└────────────────────┼────────────────────────────────────┘
                     │
                     ▼ HTTPS (POST /api/feedback)
┌─────────────────────────────────────────────────────────┐
│  Sori Backend                                            │
│  ├── TanStack Start (Server Functions)                   │
│  ├── Prisma ORM                                          │
│  └── Supabase (PostgreSQL)                               │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼ Webhook (optional)
┌─────────────────────────────────────────────────────────┐
│  Integrations                                            │
│  ├── Slack                                               │
│  ├── Discord                                             │
│  └── 카카오 알림톡                                        │
└─────────────────────────────────────────────────────────┘
```

## 모노레포 구조

```
sori/
├── package.json              # 루트 (turbo, pnpm)
├── pnpm-workspace.yaml       # 워크스페이스 정의
├── turbo.json                # Turborepo 설정
├── .gitignore
│
├── packages/                 # 라이브러리 패키지
│   ├── core/                 # Vanilla JS 위젯
│   │   ├── package.json      # @sori/core
│   │   ├── tsup.config.ts    # 번들러 설정
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts      # npm 엔트리
│   │       ├── cdn.ts        # CDN 엔트리 (auto-init)
│   │       ├── widget.ts     # 위젯 로직
│   │       ├── styles.ts     # CSS-in-JS
│   │       ├── api.ts        # API 통신
│   │       ├── i18n.ts       # 다국어
│   │       ├── icons.ts      # SVG 아이콘
│   │       └── types.ts      # 타입 정의
│   │
│   └── react/                # React wrapper
│       ├── package.json      # @sori/react
│       ├── tsup.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── SoriWidget.tsx
│           └── useSori.ts
│
├── apps/                     # 애플리케이션
│   └── web/                  # Admin 대시보드
│       ├── package.json      # @sori/web
│       ├── vite.config.ts
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           ├── routes/
│           ├── server/
│           ├── components/
│           └── lib/
│
└── tooling/                  # 공유 설정
    └── tsconfig/
        ├── package.json      # @sori/tsconfig
        ├── base.json
        ├── react.json
        └── node.json
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

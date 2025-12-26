# 모노레포 세팅 가이드

## 도구 선택

### pnpm + Turborepo 선택 이유

| 도구 | 장점 | 단점 |
|------|------|------|
| **Turborepo** | 10분 설정, 빠른 캐시, 간단함 | 아키텍처 관리 없음 |
| Nx | 기능 풍부, 대규모 지원 | 러닝커브 높음, 복잡함 |
| pnpm만 | 가볍고 심플 | 캐싱/병렬화 직접 구현 |

**결론**: pnpm workspaces + Turborepo 조합

- 경량화 목표와 일치
- 설정 간단 (10분 내)
- 빌드 캐시 (초기 30초 → 이후 0.2초)
- 탈출 용이 (나중에 pnpm만 남기면 됨)

## 프로젝트 구조

```
sori/
├── package.json              # 루트 설정
├── pnpm-workspace.yaml       # 워크스페이스 정의
├── turbo.json                # Turborepo 설정
├── .gitignore
│
├── packages/                 # 라이브러리
│   ├── core/                 # @sori/core
│   └── react/                # @sori/react
│
├── apps/                     # 애플리케이션
│   └── web/                  # @sori/web
│
└── tooling/                  # 공유 설정
    └── tsconfig/             # @sori/tsconfig
```

## 핵심 설정 파일

### package.json (루트)
```json
{
  "name": "sori",
  "private": true,
  "packageManager": "pnpm@9.15.1",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  }
}
```

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

## 패키지 설정

### @sori/tsconfig (공유 TypeScript 설정)

```
tooling/tsconfig/
├── package.json
├── base.json       # 기본 설정
├── react.json      # React 프로젝트용
└── node.json       # Node.js용
```

**base.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### @sori/core (위젯 코어)

**package.json**
```json
{
  "name": "@sori/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./cdn": {
      "import": "./dist/cdn.js",
      "types": "./dist/cdn.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "devDependencies": {
    "@sori/tsconfig": "workspace:*",
    "tsup": "^8.3.5"
  }
}
```

**tsup.config.ts**
```typescript
import { defineConfig } from "tsup";

export default defineConfig([
  // ESM + CJS for npm
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    treeshake: true,
  },
  // IIFE for CDN
  {
    entry: ["src/cdn.ts"],
    format: ["iife"],
    globalName: "Sori",
    minify: true,
  },
]);
```

### @sori/react (React wrapper)

**package.json**
```json
{
  "name": "@sori/react",
  "version": "0.0.1",
  "dependencies": {
    "@sori/core": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@sori/tsconfig": "workspace:*"
  }
}
```

### @sori/web (Admin 대시보드)

**package.json**
```json
{
  "name": "@sori/web",
  "private": true,
  "dependencies": {
    "@sori/react": "workspace:*",
    "@tanstack/react-start": "^1.132.0",
    "prisma": "^5.22.0"
  },
  "devDependencies": {
    "@sori/tsconfig": "workspace:*"
  }
}
```

## 명령어

### 설치
```bash
pnpm install
```

### 개발
```bash
# 전체 dev 모드
pnpm dev

# 특정 패키지만
pnpm --filter @sori/core dev
pnpm --filter @sori/web dev
```

### 빌드
```bash
# 전체 빌드
pnpm build

# 특정 패키지만
pnpm --filter @sori/core build
```

### 의존성 추가
```bash
# 특정 패키지에 추가
pnpm --filter @sori/web add lodash

# 워크스페이스 패키지 추가
pnpm --filter @sori/web add @sori/core@workspace:*
```

## 빌드 결과

### 번들 크기
| 패키지 | 원본 | Gzipped |
|--------|------|---------|
| @sori/core (CDN) | 8.5KB | **3.2KB** |
| @sori/react | 753B | ~300B |

### 빌드 시간 (캐시 없음)
```
@sori/core:  ~300ms
@sori/react: ~250ms
@sori/web:   ~3s
Total:       ~4s
```

### 빌드 시간 (캐시 있음)
```
Total: ~200ms (캐시 히트)
```

## 다음 단계

1. Supabase 연동 및 Prisma 7.x 업그레이드
2. 스키마 마이그레이션
3. API 엔드포인트 구현
4. 위젯 ↔ Admin 연동 테스트
5. npm 패키지 배포 준비

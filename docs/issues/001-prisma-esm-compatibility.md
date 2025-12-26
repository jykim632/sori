# Issue #001: Prisma ESM 호환성 문제

## 날짜
2024-12-26

## 환경
- **프레임워크**: TanStack Start (Vite 기반 SSR)
- **패키지 매니저**: pnpm (workspace)
- **Prisma 버전**: 7.2.0
- **Node.js**: 24.x

## 문제 요약
TanStack Start + pnpm workspace 환경에서 Prisma 사용 시 ESM/CJS 호환성 문제로 인해 서버 시작 불가.

## 증상
```
Error: Dynamic require of "path" is not supported
Error: Cannot find module '.prisma/client/default'
SyntaxError: Named export 'PrismaClient' not found
```

## 시도한 해결책

### 1. prisma-client (새 제너레이터)
```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
```
**결과**: 생성된 TS 파일이 확장자 없이 import (`import * from "./enums"`) → Node.js ESM에서 `ERR_MODULE_NOT_FOUND`

### 2. prisma-client-js (기존 제너레이터)
```prisma
generator client {
  provider = "prisma-client-js"
}
```
**결과**: CJS 모듈이라 ESM named import 불가
```
SyntaxError: Named export 'PrismaClient' not found.
The requested module '@prisma/client' is a CommonJS module
```

### 3. default import 방식
```typescript
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
```
**결과**: `.prisma/client/default` 모듈 찾기 실패
```
Error: Cannot find module '.prisma/client/default'
```

### 4. custom output 제거
기본 위치(`node_modules/.prisma/client`)에 생성하도록 변경.

**결과**: pnpm workspace의 symlink 구조로 인해 동일한 문제 지속.

### 5. Vite SSR external 설정
```typescript
// vite.config.ts
ssr: {
  external: [
    '@sori/database',
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
  ],
}
```
**결과**: 문제 해결 안 됨. Node.js가 직접 모듈을 로드할 때 CJS/ESM 충돌 발생.

## 근본 원인

1. **Prisma 내부 구조**: dynamic require, native bindings, CJS 기반 코드 생성
2. **Vite SSR**: ESM 기반, SSR external 처리 시 Node.js 직접 로드
3. **pnpm workspace**: symlink 기반 의존성 구조, Prisma의 상대 경로 resolve 실패
4. **Node.js ESM**: CJS 모듈의 named export를 직접 import 불가

## 관련 이슈
- https://github.com/prisma/prisma/issues/27072
- https://github.com/prisma/prisma/issues/24889
- https://github.com/prisma/prisma/issues/27838

## 결론
현재 스택(TanStack Start + pnpm + Vite)에서 Prisma 사용은 복잡한 workaround가 필요하며, 안정적인 해결책이 없음.

## 해결 방안
Prisma를 제거하고 `pg` 라이브러리로 직접 PostgreSQL 연결.

### 장점
- ESM/CJS 호환성 문제 없음
- 번들 크기 감소
- 단순한 의존성 구조

### 단점
- 타입 안정성 감소 → Zod 스키마로 보완
- 마이그레이션 도구 없음 → 스키마를 MD 문서로 관리
- 쿼리 작성 수동화 → 쿼리 함수 모듈화

## 참고
- better-auth는 pg Pool 직접 지원: https://www.better-auth.com/docs/adapters/postgresql

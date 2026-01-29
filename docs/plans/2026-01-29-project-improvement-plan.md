# Sori 프로젝트 종합 개선 계획

> 작성일: 2026-01-29

## 현황 분석 요약

### 문제점
1. **CDN 아키텍처 불일치**: 정적 CDN이어야 하는데 Hono 서버 사용 중
2. **Rate Limiting 중복**: 3곳에서 각각 구현됨
3. **테스트 부족**: API 보안 테스트 없음
4. **미커밋 변경**: CDN 관련 파일들이 unstaged 상태
5. **웹 성능 이슈**: TanStack Start 오버헤드, 번들 크기 비최적화

### 권장 우선순위
```
1. 미커밋 변경 정리 (빠름)
2. CDN 아키텍처 수정 (중요)
3. Rate Limiting 통합 (중간)
4. Next.js 전환 (전략적)
5. 테스트 추가 (장기)
```

---

## Phase 1: 미커밋 변경 정리

### 목표
현재 unstaged 상태의 CDN 변경사항 정리

### 작업
1. `apps/cdn/.gitignore` 커밋
2. `apps/cdn/public/` 처리 결정:
   - **Option A**: `public/widget.js`를 git에 포함 (빌드 결과물 추적)
   - **Option B**: `.gitignore`에 추가하고 빌드 시 생성 (권장)
3. `apps/cdn/package.json`, `tsconfig.json`, `vercel.json` 변경 커밋

### 검증
```bash
git status  # 깔끔한 상태 확인
```

---

## Phase 2: CDN 아키텍처 수정

### 현재 문제
- Hono 서버가 정적 파일을 서빙 (불필요한 복잡성)
- `vercel.json`의 rewrites가 정적 서빙 무력화
- `public/widget.js`가 소스와 동기화 안됨 (403줄 vs 225줄)

### 권장 아키텍처: **Vercel 정적 배포**

```
apps/cdn/
├── public/
│   └── widget.js      # 빌드된 위젯 (자동 생성)
├── src/
│   └── widget.ts      # 소스
├── package.json
├── tsconfig.json
└── vercel.json        # 정적 배포 설정
```

### 작업

#### 2.1 빌드 파이프라인 구축
```typescript
// apps/cdn/tsup.config.ts (신규)
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/widget.ts'],
  format: ['iife'],
  globalName: 'Sori',
  outDir: 'public',
  minify: true,
  sourcemap: true,
})
```

#### 2.2 package.json 수정
```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0"
  }
}
```

#### 2.3 vercel.json 단순화
```json
{
  "outputDirectory": "public",
  "headers": [
    {
      "source": "/widget.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

#### 2.4 불필요한 파일 제거
- `src/app.ts` (Hono 서버)
- `src/dev.ts` (개발 서버)
- `api/index.ts` (Vercel 함수)
- `dist/` 디렉토리

### 검증
```bash
pnpm --filter @sori/cdn build
# public/widget.js 생성 확인 (minified, ~2-3KB)
```

### 예상 결과
- 위젯 크기: ~6KB → ~2-3KB (minified)
- 서버 코드 제거로 유지보수 단순화
- Vercel에서 정적 파일로 직접 서빙 (빠름)

---

## Phase 3: Rate Limiting 통합

### 현재 문제
3곳에서 각각 구현:
- `apps/web/src/routes/api/v1/feedback.ts:11-24`
- `apps/web/src/routes/api/v1/tickets.$token.ts:9-23`
- `apps/web/src/lib/api-rate-limit.ts`

### 해결 방안

#### 3.1 통합 Rate Limiter 생성
```typescript
// apps/web/src/lib/rate-limiter.ts
interface RateLimiterConfig {
  maxRequests: number
  windowMs: number
  cleanupIntervalMs?: number
}

export function createRateLimiter(config: RateLimiterConfig) {
  const requests = new Map<string, { count: number; resetAt: number }>()

  // Cleanup 로직
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of requests) {
      if (value.resetAt < now) requests.delete(key)
    }
  }, config.cleanupIntervalMs ?? 60000)

  return {
    check(identifier: string): { allowed: boolean; remaining: number } {
      // ... 구현
    }
  }
}

// 사전 정의된 인스턴스
export const feedbackRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60000
})

export const ticketRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60000
})
```

#### 3.2 기존 코드 교체
각 API 파일에서 인라인 구현을 import로 교체

### 검증
```bash
pnpm --filter @sori/web test -- rate-limit
```

---

## Phase 4: Next.js 전환

### 전환 개요
- **현재**: TanStack Start + Nitro + Vite
- **목표**: Next.js 15 App Router
- **예상 기간**: 4-6일

### 4.1 프로젝트 설정

#### next.config.js 생성
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sori/database', 'pg', 'better-auth', 'resend'],
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
}
```

#### 의존성 변경
```diff
- "@tanstack/react-start": "^1.132.0"
- "@tanstack/react-router": "^1.132.0"
- "vite": "^7.1.7"
+ "next": "^15.1.0"
```

### 4.2 라우트 마이그레이션

| 현재 경로 | Next.js 경로 |
|-----------|-------------|
| `src/routes/__root.tsx` | `app/layout.tsx` |
| `src/routes/(auth)/login.tsx` | `app/(auth)/login/page.tsx` |
| `src/routes/$orgId/admin/feedbacks.tsx` | `app/[orgId]/admin/feedbacks/page.tsx` |
| `src/routes/api/v1/feedback.ts` | `app/api/v1/feedback/route.ts` |

### 4.3 서버 함수 마이그레이션

**Before (TanStack Start):**
```typescript
export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(CreateOrganizationInputSchema))
  .handler(async ({ data }) => { ... });
```

**After (Next.js Server Actions):**
```typescript
"use server";
export async function createOrganization(input: z.infer<typeof CreateOrganizationInputSchema>) {
  const validated = CreateOrganizationInputSchema.parse(input);
  // ... implementation
}
```

### 4.4 세션 캐시 마이그레이션

**Before:**
```typescript
import { getRequest } from "@tanstack/react-start/server";
```

**After:**
```typescript
import { cookies, headers } from "next/headers";
import { cache } from "react";

export const getCachedSession = cache(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  return auth.api.getSession({ headers: Object.fromEntries(headersList.entries()) });
});
```

### 4.5 환경변수 변경

| Vite | Next.js |
|------|---------|
| `VITE_APP_URL` | `NEXT_PUBLIC_APP_URL` |

### 4.6 삭제할 파일
- `vite.config.ts`
- `src/router.tsx`
- `src/routeTree.gen.ts`
- `.cta.json`
- `src/routes/` 전체 (app/으로 대체)

### 주요 마이그레이션 대상 파일

| 파일 | 중요도 | 설명 |
|------|--------|------|
| `src/routes/__root.tsx` | HIGH | app/layout.tsx 템플릿 |
| `src/server/organization.ts` | HIGH | Server Actions 변환 패턴 |
| `src/routes/api/v1/feedback.ts` | HIGH | 복잡한 API (CORS, rate limit) |
| `src/routes/$orgId/admin/feedbacks.tsx` | HIGH | 가장 복잡한 페이지 (708줄) |
| `src/lib/session-cache.ts` | MEDIUM | React.cache() 마이그레이션 |

---

## Phase 5: 테스트 추가

### 우선순위 높은 테스트 대상
1. **API 인증** (`authenticateApiKey`)
2. **CORS 검증** (origin matching)
3. **Rate Limiting** (통합 후)
4. **권한 검증** (ownership checks)

### 테스트 파일 생성
```
apps/web/src/lib/
├── api-auth.test.ts          # 신규
├── rate-limiter.test.ts      # 통합 후 신규
└── cors-validator.test.ts    # 신규
```

---

## 파일 변경 요약

### 수정 파일
- `apps/cdn/package.json`
- `apps/cdn/vercel.json`
- `apps/cdn/tsconfig.json`
- `apps/web/src/routes/api/v1/feedback.ts`
- `apps/web/src/routes/api/v1/tickets.$token.ts`

### 신규 파일
- `apps/cdn/tsup.config.ts`
- `apps/web/src/lib/rate-limiter.ts`
- `apps/web/src/lib/*.test.ts` (테스트)

### 삭제 파일
- `apps/cdn/src/app.ts`
- `apps/cdn/src/dev.ts`
- `apps/cdn/api/index.ts`
- `apps/cdn/dist/`

---

## 실행 순서 (권장)

```
Day 1: Phase 1 (미커밋 정리) + Phase 2 (CDN 아키텍처)
Day 2: Phase 3 (Rate Limiting 통합)
Day 3-4: Phase 4.1-4.3 (Next.js 설정 + 라우트 마이그레이션)
Day 5: Phase 4.4-4.6 (세션, 환경변수, 정리)
Day 6: Phase 5 (테스트 추가) + 전체 검증
```

---

## 검증 체크리스트

### CDN
- [ ] `pnpm --filter @sori/cdn build` 성공
- [ ] `public/widget.js` 생성됨 (minified, ~2-3KB)
- [ ] Vercel 배포 테스트
- [ ] CORS 헤더 정상 동작

### Rate Limiting
- [ ] 통합 모듈 테스트 통과
- [ ] 기존 3곳 모두 교체 완료

### Next.js 전환
- [ ] 인증 플로우 (이메일/OAuth)
- [ ] 조직 관리 (생성/전환/설정)
- [ ] 프로젝트 관리 (CRUD)
- [ ] 피드백 관리 (필터/검색/페이지네이션/상태변경)
- [ ] 위젯 API (제출/CORS/rate limit)
- [ ] 알림 (이메일/Slack/Webhook)
- [ ] SSR 정상 동작
- [ ] Hydration 오류 없음

### 전체
- [ ] `pnpm build` 성공
- [ ] `pnpm test` 통과
- [ ] 개발 서버 정상 동작
- [ ] Vercel 배포 성공

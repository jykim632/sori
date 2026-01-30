# Next.js 16 Migration Guide

> TanStack Start → Next.js 16.1.6 App Router 전환 참조 문서

## Phase 순서

```
Phase 0: 준비 (브랜치, 환경변수)
Phase 1: Next.js 앱 스캐폴딩 (설정 파일)
Phase 2: 인프라 레이어 (인증, 캐시, 미들웨어)
Phase 3: API Route Handlers (10개)
Phase 4: Server Functions → Queries + Actions (29개)
Phase 5: 페이지 라우트 (18개)
Phase 6: 정리 및 검증
```

---

## Phase 0: 준비

- 브랜치: `feat/nextjs-migration`
- 공유 패키지 변경 없음: `@sori/database`, `@sori/core`, `@sori/react`
- 환경변수 변경: `VITE_APP_URL` → `NEXT_PUBLIC_APP_URL`

---

## Phase 1: 스캐폴딩

### 디렉토리 구조

```
apps/web-next/
├── next.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   ├── api/
│   │   ├── f/[token]/
│   │   ├── guide/
│   │   ├── privacy/
│   │   ├── terms/
│   │   ├── organizations/
│   │   └── [orgId]/
│   ├── lib/
│   ├── server/
│   └── components/
```

### next.config.ts 핵심 설정

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sori/database", "pg", "better-auth", "resend"],
  transpilePackages: ["@sori/database", "@sori/react"],
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

### package.json 의존성 변경

**제거:**
- `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`
- `@tanstack/react-devtools`, `@tanstack/react-router-devtools`
- `@tanstack/react-router-ssr-query`
- `nitro`, `@tailwindcss/vite`, `vite-tsconfig-paths`
- `vite`, `@vitejs/plugin-react`, `@tanstack/devtools-vite`

**추가:**
- `next@16.1.6`

**유지:**
- `@sori/database`, `@sori/react`, `better-auth`, `pg`, `resend`
- `react@^19.2.0`, `react-dom@^19.2.0`, `zod`, `lucide-react`
- `@vercel/analytics`, `tailwindcss`

---

## Phase 2: 인프라 레이어

### 변경 없이 복사 (경로 동일)

| 파일 | 비고 |
|---|---|
| `lib/errors.ts` | 그대로 |
| `lib/api-auth.ts` | 그대로 |
| `lib/api-rate-limit.ts` | 그대로 |
| `lib/api-utils/index.ts` | 그대로 |
| `lib/api-utils/rate-limit.ts` | 그대로 |
| `lib/api-utils/token-validation.ts` | 그대로 |
| `lib/db.ts` | 그대로 |
| `lib/schemas/server-input.ts` | 그대로 |
| `lib/notification/**` | 전체 복사 |
| `lib/webhook/**` | 전체 복사 |
| `server/auth-helpers.ts` | 그대로 (session-cache import만 동작 확인) |

### 핵심 재작성 (3파일)

#### `lib/session-cache.ts`

```ts
// Before (TanStack)
import { getRequest } from "@tanstack/react-start/server";
const sessionCache = new WeakMap<Request, Promise<Session | null>>();
export async function getCachedSession() {
  const request = getRequest();
  // WeakMap 기반 캐싱
}

// After (Next.js)
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";
import type { Session } from "./auth";

export const getCachedSession = cache(async (): Promise<Session | null> => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});
```

#### `lib/role-cache.ts`

```ts
// Before (TanStack)
import { getRequest } from "@tanstack/react-start/server";
const roleCache = new WeakMap<Request, Map<string, Promise<string | null>>>();

// After (Next.js)
import { cache } from "react";
import { getUserRoleInOrganization } from "@sori/database";

export const getCachedRole = cache(
  async (userId: string, organizationId: string): Promise<string | null> => {
    return getUserRoleInOrganization(userId, organizationId);
  }
);
```

> **주의**: React `cache()`는 동일 인자에 대한 자동 dedup을 하지 않음.
> 하지만 같은 request 내 동일 호출은 React의 request-scoped cache로 처리됨.

#### `lib/auth-client.ts`

```ts
// Before
import.meta.env.VITE_APP_URL

// After
"use client";
import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return typeof window !== "undefined" ? window.location.origin : "";
};

export const authClient = createAuthClient({ baseURL: getBaseURL() });
export const { signIn, signUp, signOut, useSession } = authClient;
```

#### `lib/auth.ts` — 변경 없음

`process.env` 기반이라 그대로 동작.

#### `lib/zod-validator.ts` — 삭제

TanStack `inputValidator` 전용. Next.js에서는 각 함수에서 직접 `schema.parse()` 호출.

### 미들웨어 (`src/middleware.ts`)

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/organizations", "/onboarding"];
const ORG_PATH_REGEX = /^\/[^/]+\/admin/;
const AUTH_ONLY_PATHS = ["/login", "/signup"];
const SESSION_COOKIE = "better-auth.session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // 인증된 사용자가 로그인/회원가입 접근 → 리다이렉트
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL("/organizations", request.url));
  }

  // 미인증 사용자가 보호된 경로 접근 → 로그인으로
  const isProtected =
    PROTECTED_PATHS.some((p) => pathname.startsWith(p)) ||
    ORG_PATH_REGEX.test(pathname);

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

> **주의**: `SESSION_COOKIE` 이름은 better-auth 실제 쿠키명과 일치시켜야 함. 브라우저 DevTools에서 확인 필요.

---

## Phase 3: API Route Handlers

### 매핑 테이블

| TanStack 경로 | Next.js 경로 | HTTP |
|---|---|---|
| `api/auth/$.ts` | `app/api/auth/[...all]/route.ts` | ALL |
| `api/v1/feedback.ts` | `app/api/v1/feedback/route.ts` | POST, OPTIONS |
| `api/v1/feedbacks.ts` | `app/api/v1/feedbacks/route.ts` | GET, OPTIONS |
| `api/v1/feedbacks.$feedbackId.ts` | `app/api/v1/feedbacks/[feedbackId]/route.ts` | GET, PATCH, OPTIONS |
| `api/v1/feedbacks.$fid.replies.ts` | `app/api/v1/feedbacks/[feedbackId]/replies/route.ts` | GET, POST, OPTIONS |
| `api/v1/feedbacks.$fid.replies.$rid.ts` | `app/api/v1/feedbacks/[feedbackId]/replies/[replyId]/route.ts` | PATCH, DELETE, OPTIONS |
| `api/v1/widget.ts` | `app/api/v1/widget/route.ts` | GET |
| `api/v1/projects.$pid.widget-config.ts` | `app/api/v1/projects/[projectId]/widget-config/route.ts` | GET, OPTIONS |
| `api/v1/tickets.$token.ts` | `app/api/v1/tickets/[token]/route.ts` | GET |
| `api/v1/tickets.$token.replies.ts` | `app/api/v1/tickets/[token]/replies/route.ts` | POST |

### 변환 패턴

```ts
// === Before (TanStack) ===
import { createFileRoute } from "@tanstack/react-start";

export const Route = createFileRoute("/api/v1/feedbacks/$feedbackId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { feedbackId } = params;
        // ...
      },
    },
  },
});

// === After (Next.js 16) ===
// ⚠️ params가 Promise임에 주의
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const { feedbackId } = await params;
  // ... 동일 로직
}

export async function OPTIONS() {
  // preflight 처리 (기존 apiOptions() 사용)
}
```

### better-auth 특수 라우트

```ts
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

## Phase 4: Server Functions → Queries + Actions

### 파일 분리 구조

```
src/server/
├── auth-helpers.ts          (변경 없음)
├── queries/
│   ├── feedback.ts          (getFeedbacks, getFeedbacksFiltered)
│   ├── projects.ts          (getProjects, getProjectById)
│   ├── organization.ts      (getUserOrganizations, getUserOrganization,
│   │                         getOrganizationWithProjects, getUserRoleInOrganization)
│   ├── reply.ts             (getReplies)
│   ├── webhook.ts           (getWebhooks)
│   └── project-notification.ts (getNotificationSetting)
└── actions/
    ├── feedback.ts          (createFeedback, updateFeedbackStatus)
    ├── projects.ts          (createProject, updateProject, deleteProject,
    │                         generateApiKey, revokeApiKey)
    ├── organization.ts      (createOrganization, updateOrganizationWebhook, testWebhook)
    ├── reply.ts             (createReply, updateReply, deleteReply)
    ├── webhook.ts           (createWebhook, updateWebhook, deleteWebhook, testWebhookById)
    └── project-notification.ts (updateNotificationSetting)
```

### Query 변환 패턴

```ts
// === Before (TanStack createServerFn) ===
import { createServerFn } from "@tanstack/react-start";

export const getProjects = createServerFn()
  .validator(zodValidator(GetProjectsInputSchema))
  .handler(async ({ data }) => {
    const { userId } = await requireOrgMembership(data.organizationId);
    return getProjectsQuery(data.organizationId);
  });

// === After (plain async function) ===
import { GetProjectsInputSchema } from "@/lib/schemas/server-input";
import { requireOrgMembership } from "@/server/auth-helpers";
import { getProjects as getProjectsQuery } from "@sori/database";

export async function getProjects(input: { organizationId?: string }) {
  const data = GetProjectsInputSchema.parse(input);
  await requireOrgMembership(data.organizationId!);
  return getProjectsQuery(data.organizationId);
}
```

### Action 변환 패턴

```ts
// === Before ===
export const createProject = createServerFn()
  .validator(zodValidator(CreateProjectInputSchema))
  .handler(async ({ data }) => {
    await requireOrgAdmin(data.organizationId);
    return createProjectQuery({ ... });
  });

// === After ===
"use server";

import { CreateProjectInputSchema } from "@/lib/schemas/server-input";
import { requireOrgAdmin } from "@/server/auth-helpers";
import { createProject as createProjectQuery } from "@sori/database";

export async function createProject(input: {
  name: string;
  organizationId: string;
  allowedOrigins?: string[];
}) {
  const data = CreateProjectInputSchema.parse(input);
  await requireOrgAdmin(data.organizationId);
  return createProjectQuery({ ...data });
}
```

### getSession 함수

```ts
// Before: createServerFn + auth.api.getSession
// After: getCachedSession 직접 사용 (Server Component에서 호출)

// 기존 server/auth.ts의 getSession은 삭제
// 각 Server Component에서 직접:
import { getCachedSession } from "@/lib/session-cache";
const session = await getCachedSession();
```

---

## Phase 5: 페이지 라우트

### 디렉토리 매핑

| TanStack 라우트 | Next.js App Router |
|---|---|
| `routes/__root.tsx` | `app/layout.tsx` |
| `routes/index.tsx` | `app/page.tsx` |
| `routes/(auth)/login.tsx` | `app/(auth)/login/page.tsx` |
| `routes/(auth)/signup.tsx` | `app/(auth)/signup/page.tsx` |
| `routes/(auth)/onboarding.tsx` | `app/(auth)/onboarding/page.tsx` |
| `routes/(auth)/verify-email.tsx` | `app/(auth)/verify-email/page.tsx` |
| `routes/guide.tsx` | `app/guide/page.tsx` |
| `routes/privacy.tsx` | `app/privacy/page.tsx` |
| `routes/terms.tsx` | `app/terms/page.tsx` |
| `routes/organizations.tsx` | `app/organizations/page.tsx` |
| `routes/f/$token.tsx` | `app/f/[token]/page.tsx` |
| `routes/$orgId/route.tsx` | `app/[orgId]/layout.tsx` |
| `routes/$orgId/admin.tsx` | `app/[orgId]/admin/layout.tsx` |
| `routes/$orgId/admin/index.tsx` | `app/[orgId]/admin/page.tsx` |
| `routes/$orgId/admin/feedbacks.tsx` | `app/[orgId]/admin/feedbacks/page.tsx` |
| `routes/$orgId/admin/settings.tsx` | `app/[orgId]/admin/settings/page.tsx` |
| `routes/$orgId/admin/projects/index.tsx` | `app/[orgId]/admin/projects/page.tsx` |
| `routes/$orgId/admin/projects/$projectId.tsx` | `app/[orgId]/admin/projects/[projectId]/page.tsx` |

### API 매핑 (TanStack → Next.js)

| TanStack | Next.js | 비고 |
|---|---|---|
| `Route.useRouteContext()` | `useOrgContext()` | 커스텀 React Context |
| `Route.useParams()` | `useParams()` | `next/navigation` |
| `useNavigate()` → `navigate({ to })` | `useRouter()` → `router.push()` | `next/navigation` |
| `useMatches()` | `usePathname()` | `next/navigation` |
| `<Link to="..." params={}>` | `<Link href={`/path`}>` | `next/link` |
| `validateSearch` | `useSearchParams()` | 수동 validation |
| `beforeLoad` | Layout Server Component | 데이터 페칭 |
| `Route.useRouteContext()` for org data | `useOrgContext()` | Provider in layout |

### 페이지 변환 패턴

```tsx
// === Before (TanStack - 단일 파일) ===
export const Route = createFileRoute("/$orgId/admin/feedbacks")({
  component: FeedbacksPage,
});

function FeedbacksPage() {
  const { orgId } = Route.useParams();
  const context = Route.useRouteContext();
  // ... 클라이언트 로직
}

// === After (Next.js - Server + Client 분리) ===

// app/[orgId]/admin/feedbacks/page.tsx (Server Component)
import { getFeedbacksFiltered } from "@/server/queries/feedback";
import { FeedbacksPageClient } from "./page-client";

export default async function FeedbacksPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const feedbacks = await getFeedbacksFiltered({ organizationId: orgId });
  return <FeedbacksPageClient initialData={feedbacks} />;
}

// app/[orgId]/admin/feedbacks/page-client.tsx
"use client";
import { useOrgContext } from "../org-context";

export function FeedbacksPageClient({ initialData }) {
  const { organization } = useOrgContext();
  // ... 클라이언트 로직
}
```

### OrgContext (신규)

```tsx
// app/[orgId]/org-context.tsx
"use client";
import { createContext, useContext } from "react";

interface OrgContextValue {
  organization: { id: string; name: string; slug: string };
  projects: Array<{ id: string; name: string }>;
  userRole: string;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: OrgContextValue;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used within OrgContextProvider");
  return ctx;
}
```

### [orgId] Layout (인증 가드 + Context)

```tsx
// app/[orgId]/layout.tsx (Server Component)
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session-cache";
import { getCachedRole } from "@/lib/role-cache";
import { getOrganizationWithProjects } from "@/server/queries/organization";
import { OrgContextProvider } from "./org-context";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/login");
  }

  const [org, role] = await Promise.all([
    getOrganizationWithProjects(orgId),
    getCachedRole(session.user.id, orgId),
  ]);

  if (!org || !role) {
    redirect("/organizations");
  }

  return (
    <OrgContextProvider
      value={{
        organization: org,
        projects: org.projects,
        userRole: role,
      }}
    >
      {children}
    </OrgContextProvider>
  );
}
```

---

## Phase 6: 정리

### 디렉토리 전환

```bash
mv apps/web apps/web-legacy
mv apps/web-next apps/web
# pnpm install
# 검증 후 apps/web-legacy 삭제
```

### 삭제 대상 (web-legacy)

- `vite.config.ts`
- `router.tsx`, `routeTree.gen.ts`
- `.cta.json`
- TanStack 관련 의존성 전체

### 검증 체크리스트

**API:**
- [ ] `POST /api/v1/feedback` — 위젯 피드백 제출
- [ ] `GET /api/v1/feedbacks` — API 키 인증 조회
- [ ] `GET /api/v1/widget` — 위젯 JS 서빙
- [ ] `GET /api/v1/tickets/[token]` — 티켓 조회
- [ ] `POST /api/v1/tickets/[token]/replies` — 티켓 답변
- [ ] `GET/POST /api/auth/*` — better-auth 전체

**페이지:**
- [ ] 로그인/회원가입 → 이메일 인증 → 온보딩
- [ ] 조직 목록 → 조직 선택
- [ ] 프로젝트 CRUD
- [ ] 피드백 목록, 필터, 페이지네이션
- [ ] 피드백 상세 + 답글
- [ ] 설정: 웹훅, 알림
- [ ] 정적 페이지: guide, privacy, terms

**인증:**
- [ ] 미인증 → 보호 경로 접근 시 `/login` 리다이렉트
- [ ] 인증 후 `/login` 접근 시 `/organizations` 리다이렉트
- [ ] better-auth 쿠키명 일치 확인

---

## 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| better-auth 쿠키명 불일치 | 브라우저 DevTools에서 실제 쿠키명 확인. `better-auth.session_token` 또는 커스텀 |
| Next.js 16 `params`가 Promise | 모든 page/layout/route에서 `await params` 필수 |
| in-memory rate limiter가 serverless에서 리셋 | 현재 규모에서 허용. 추후 Redis 전환 고려 |
| `readFileSync` 경로 차이 (widget route) | `process.cwd()` 기반으로 변경, 빌드 후 테스트 |
| 대형 Client Component | React Compiler 자동 최적화 + 필요시 수동 분리 |

---

## .env.example 변경

```bash
# Before (TanStack/Vite)
VITE_API_URL="http://localhost:3000"

# After (Next.js)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

# Prisma → pg 마이그레이션 리포트

**작성일**: 2025-12-26
**작성자**: Claude Code
**관련 이슈**: [001-prisma-esm-compatibility.md](./issues/001-prisma-esm-compatibility.md)

---

## 배경

TanStack Start (Vite 기반 SSR 프레임워크) + pnpm workspace 환경에서 Prisma 7.x 사용 시 ESM/CJS 호환성 문제가 지속적으로 발생했습니다. 여러 해결책을 시도했으나 근본적인 해결이 어려워, Prisma를 제거하고 pg (node-postgres)를 직접 사용하는 방향으로 마이그레이션을 진행했습니다.

### 문제 요약
- `prisma-client` 제너레이터: 생성된 TS 파일이 확장자 없이 import → Node.js ESM에서 실패
- `prisma-client-js` 제너레이터: CJS 모듈이라 ESM named import 불가
- Vite SSR external 처리와 pnpm workspace symlink 구조 충돌
- 자세한 내용은 [문제 보고서](./issues/001-prisma-esm-compatibility.md) 참조

---

## 마이그레이션 개요

### 기술 스택 변경

| 항목 | Before | After |
|------|--------|-------|
| ORM/Query | Prisma 7.x | pg (node-postgres) |
| 타입 정의 | Prisma 생성 타입 | Zod 스키마 + z.infer |
| 스키마 관리 | schema.prisma | docs/database-schema.md (SQL DDL) |
| better-auth | prismaAdapter | pg Pool 직접 전달 |

### 장점
1. **ESM 호환성 문제 해결**: 순수 JS/TS 모듈만 사용
2. **런타임 검증**: Zod를 통한 DB 응답 및 API 입력 검증
3. **번들 크기 감소**: Prisma 런타임 제거
4. **단순성**: 복잡한 설정 없이 직관적인 SQL 쿼리

### 단점
1. **수동 쿼리 작성**: SQL을 직접 작성해야 함
2. **타입 동기화**: 스키마 변경 시 Zod 스키마도 수동 업데이트 필요
3. **마이그레이션 도구 없음**: 스키마 변경은 수동 SQL로 처리

---

## 변경 내용

### 1. 패키지 구조 변경

```
packages/database/
├── prisma/                    # 삭제됨
│   └── schema.prisma
├── generated/                 # 삭제됨
├── prisma.config.ts           # 삭제됨
├── tsup.config.ts             # 삭제됨
└── src/
    ├── client.ts              # Prisma → pg Pool
    ├── index.ts               # re-export
    ├── types.ts               # 신규: z.infer 타입
    ├── schemas/               # 신규: Zod 스키마
    │   ├── enums.ts
    │   ├── user.ts
    │   ├── organization.ts
    │   ├── project.ts
    │   ├── feedback.ts
    │   ├── webhook.ts
    │   └── index.ts
    └── queries/               # 신규: 쿼리 함수
        ├── feedback.ts
        ├── project.ts
        ├── organization.ts
        ├── webhook.ts
        └── index.ts
```

### 2. 의존성 변경

**package.json (packages/database)**
```json
{
  "dependencies": {
    "pg": "^8.16.0",
    "zod": "^4.2.1"
  },
  "devDependencies": {
    "@types/pg": "^8.15.4"
  }
}
```

제거된 의존성:
- `prisma`
- `@prisma/client`
- `@prisma/adapter-pg`
- `tsup`

### 3. 클라이언트 구현

**packages/database/src/client.ts**
```typescript
import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

export const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// 헬퍼 함수들
export async function query<T>(text: string, params?: unknown[]): Promise<T[]>;
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
export async function queryReturning<T>(text: string, params?: unknown[]): Promise<T>;
export function generateId(): string;
```

### 4. Zod 스키마 구조

**packages/database/src/schemas/enums.ts**
```typescript
import { z } from "zod";

export const MemberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export const PlanSchema = z.enum(["FREE", "PRO", "TEAM", "ENTERPRISE"]);
export const FeedbackTypeSchema = z.enum(["BUG", "INQUIRY", "FEATURE"]);
export const FeedbackStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const WebhookTypeSchema = z.enum(["SLACK", "DISCORD", "TELEGRAM", "CUSTOM"]);
export const LocaleSchema = z.enum(["ko", "en", "ja"]);
```

**packages/database/src/types.ts**
```typescript
import { z } from "zod";
import { FeedbackSchema } from "./schemas/feedback.ts";

export type Feedback = z.infer<typeof FeedbackSchema>;
// ... 기타 타입들
```

### 5. 쿼리 함수 패턴

**Prisma → pg 변환 예시**

```typescript
// Before (Prisma)
const feedbacks = await prisma.feedback.findMany({
  where: { projectId },
  include: { project: true },
  orderBy: { createdAt: 'desc' }
});

// After (pg)
const sql = `
  SELECT
    f.id, f.type, f.message, f.email, f.status, f.priority, f.metadata,
    f.project_id as "projectId", f.created_at as "createdAt",
    json_build_object(
      'id', p.id,
      'name', p.name,
      'organizationId', p.organization_id
    ) as project
  FROM feedback f
  JOIN project p ON f.project_id = p.id
  WHERE f.project_id = $1
  ORDER BY f.created_at DESC
`;
return query<FeedbackWithProject>(sql, [projectId]);
```

### 6. better-auth 설정 변경

**apps/web/src/lib/auth.ts**
```typescript
// Before
import { prisma } from "@sori/database";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // ...
});

// After
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  database: pool,  // pg Pool 직접 전달
  // ...
});
```

### 7. 서버 함수 수정

**apps/web/src/server/*.ts**

모든 서버 함수에서 Prisma 메서드 호출을 새로운 쿼리 함수로 교체:

```typescript
// Before
import { prisma } from "@sori/database";
const feedbacks = await prisma.feedback.findMany({ where: { projectId } });

// After
import { getFeedbacks } from "@sori/database";
const feedbacks = await getFeedbacks({ projectId });
```

### 8. ESM Import 확장자

Node.js ESM에서는 상대 경로 import 시 파일 확장자가 필요합니다:

```typescript
// Before (실패)
export * from "./client";
import { query } from "../client";

// After (성공)
export * from "./client.ts";
import { query } from "../client.ts";
```

---

## 수정된 파일 목록

### 생성
1. `docs/issues/001-prisma-esm-compatibility.md` - 문제 보고서
2. `docs/database-schema.md` - SQL DDL 스키마 문서
3. `packages/database/src/schemas/enums.ts`
4. `packages/database/src/schemas/user.ts`
5. `packages/database/src/schemas/organization.ts`
6. `packages/database/src/schemas/project.ts`
7. `packages/database/src/schemas/feedback.ts`
8. `packages/database/src/schemas/webhook.ts`
9. `packages/database/src/schemas/index.ts`
10. `packages/database/src/types.ts`
11. `packages/database/src/queries/feedback.ts`
12. `packages/database/src/queries/project.ts`
13. `packages/database/src/queries/organization.ts`
14. `packages/database/src/queries/webhook.ts`
15. `packages/database/src/queries/index.ts`

### 수정
16. `packages/database/src/client.ts` - pg Pool로 변경
17. `packages/database/src/index.ts` - export 변경
18. `packages/database/package.json` - 의존성 변경
19. `apps/web/src/lib/auth.ts` - pg Pool 직접 전달
20. `apps/web/src/lib/db.ts` - export 변경
21. `apps/web/src/server/feedback.ts` - 쿼리 함수 사용
22. `apps/web/src/server/projects.ts` - 쿼리 함수 사용
23. `apps/web/src/server/organization.ts` - 쿼리 함수 사용
24. `apps/web/src/server/webhook.ts` - 쿼리 함수 사용
25. `apps/web/src/routes/api/v1/feedback.ts` - 쿼리 함수 사용

### 삭제
26. `packages/database/prisma/` 폴더 전체
27. `packages/database/generated/` 폴더 전체
28. `packages/database/prisma.config.ts`
29. `packages/database/tsup.config.ts`

---

## 테스트 결과

- **개발 서버 시작**: 성공 (Vite v7.3.0, 503ms)
- **홈페이지 요청**: HTTP 200 OK
- **ESM 모듈 해결**: 정상 동작

---

## 향후 고려사항

### 스키마 변경 시 작업 순서
1. `docs/database-schema.md`에 DDL 변경 내용 문서화
2. 데이터베이스에 직접 ALTER TABLE 실행 (또는 별도 마이그레이션 스크립트)
3. `packages/database/src/schemas/`에 Zod 스키마 업데이트
4. `packages/database/src/types.ts`에 타입 업데이트 (필요시)
5. `packages/database/src/queries/`에 쿼리 함수 업데이트 (필요시)

### 개선 가능 영역
- 마이그레이션 스크립트 도구 도입 (예: node-pg-migrate)
- 쿼리 빌더 라이브러리 도입 검토 (예: kysely, drizzle)
- Zod 스키마 기반 자동 타입 생성 최적화

---

## 참고 자료

- [better-auth PostgreSQL Adapter](https://www.better-auth.com/docs/adapters/postgresql)
- [node-postgres 문서](https://node-postgres.com/)
- [Zod 문서](https://zod.dev/)
- [Prisma ESM Issues](https://github.com/prisma/prisma/issues/27072)

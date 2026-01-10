# DBA 피드백 보고서

**작성일**: 2026-01-10
**검토자**: Senior DBA
**검토 대상**: Sori 프로젝트 데이터베이스 아키텍처

---

## 요약

전반적으로 잘 설계된 멀티테넌트 구조를 갖추고 있으며, 보안 측면에서 SQL 인젝션 방어가 적절히 되어 있습니다. 그러나 확장성, 인덱스 최적화, 마이그레이션 관리 측면에서 개선이 필요합니다.

### 위험도 분류

| 등급 | 설명 |
|------|------|
| **Critical** | 즉시 수정 필요 (데이터 손실/보안 위험) |
| **High** | 조기 수정 권장 (성능/안정성 영향) |
| **Medium** | 계획된 개선 권장 |
| **Low** | 장기 개선 사항 |

---

## 1. 스키마 설계 검토

### 1.1 Primary Key 타입 [Medium]

**현황**: 모든 테이블에서 TEXT 타입을 Primary Key로 사용

```sql
"id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()
```

**문제점**:
- TEXT 비교는 UUID/BIGINT 비교보다 느림
- 인덱스 크기 증가 (평균 36바이트 vs 16바이트 UUID 또는 8바이트 BIGINT)
- B-tree 인덱스 효율성 저하

**권장사항**:
```sql
-- 옵션 1: UUID 타입 사용 (권장)
"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- 옵션 2: 기존 유지 (호환성 중시)
-- 현재 상태 유지하되, 향후 마이그레이션 고려
```

### 1.2 CUID 생성 함수 [Medium]

**현황**: `client.ts`에서 직접 CUID 생성

```typescript
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
}
```

**문제점**:
- `Math.random()`은 암호학적으로 안전하지 않음
- 충돌 가능성 존재 (낮지만 0은 아님)
- 분산 환경에서 중복 가능성

**권장사항**:
```typescript
import { randomBytes } from "crypto";

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString("base64url");
  return `c${timestamp}${randomPart}`;
}
```

또는 검증된 라이브러리 사용:
```bash
pnpm add @paralleldrive/cuid2
```

### 1.3 정규화 수준 [Good]

- 3NF 수준으로 적절히 정규화됨
- 멀티테넌트 분리가 명확함 (Organization 기반)
- JSON 필드(metadata, widget_config)는 스키마리스 데이터에 적절

---

## 2. 인덱스 전략 [High]

### 2.1 현재 인덱스 현황

| 테이블 | 인덱스 | 상태 |
|--------|--------|------|
| session | user_id | O |
| account | user_id | O |
| organization_member | user_id, organization_id | O |
| project | organization_id | O |
| feedback | project_id, status, created_at | O |
| reply | feedback_id | O |
| webhook | organization_id | O |

### 2.2 누락된 인덱스 [High]

#### feedback 테이블

```sql
-- 이메일 검색용 (ILIKE 쿼리 최적화)
CREATE INDEX feedback_email_idx ON feedback(email);

-- 타입별 필터링
CREATE INDEX feedback_type_idx ON feedback(type);

-- 복합 인덱스 (어드민 필터링 쿼리 최적화)
CREATE INDEX feedback_project_status_created_idx
  ON feedback(project_id, status, created_at DESC);

-- 우선순위별 정렬
CREATE INDEX feedback_priority_idx ON feedback(priority)
  WHERE priority IS NOT NULL;
```

#### account 테이블

```sql
-- OAuth 로그인 시 빠른 조회
CREATE UNIQUE INDEX account_provider_account_idx
  ON account(provider_id, account_id);
```

#### verification 테이블

```sql
-- 토큰 조회
CREATE INDEX verification_token_idx ON verification(token);

-- 만료된 토큰 정리용
CREATE INDEX verification_expires_idx ON verification(expires_at);
```

#### project 테이블

```sql
-- API 키 조회 (이미 UNIQUE이지만 NULL 허용)
-- 현재: api_key TEXT UNIQUE
-- NULL이 아닌 경우만 조회하므로 부분 인덱스 권장
CREATE INDEX project_api_key_active_idx ON project(api_key)
  WHERE api_key IS NOT NULL;
```

### 2.3 Full Text Search [Medium]

**현황**: ILIKE 사용

```typescript
conditions.push(`(f.message ILIKE $${paramIndex} OR f.email ILIKE $${paramIndex})`);
params.push(`%${search}%`);
```

**문제점**:
- `%search%` 패턴은 인덱스를 사용할 수 없음
- 대용량 데이터에서 Full Table Scan 발생

**권장사항**:

```sql
-- GIN 인덱스 생성
CREATE INDEX feedback_message_search_idx ON feedback
  USING gin(to_tsvector('simple', message));

-- 쿼리 변경
SELECT * FROM feedback
WHERE to_tsvector('simple', message) @@ plainto_tsquery('simple', $1);
```

또는 pg_trgm 확장 사용:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX feedback_message_trgm_idx ON feedback
  USING gin(message gin_trgm_ops);
```

---

## 3. 쿼리 성능 분석 [High]

### 3.1 COUNT(*) 성능 [High]

**현황**: `feedback.ts:178`

```typescript
const countSql = `SELECT COUNT(*) as total FROM feedback WHERE ${whereClause}`;
```

**문제점**:
- PostgreSQL에서 COUNT(*)는 모든 행을 스캔해야 함
- 대용량 테이블에서 수 초 소요 가능

**권장사항**:

1. **근사치 사용** (속도 우선):
```sql
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'feedback';
```

2. **캐싱** (정확도 우선):
```typescript
// Redis 또는 인메모리 캐시 사용
const cacheKey = `feedback:count:${organizationId}`;
let total = await cache.get(cacheKey);
if (!total) {
  total = await query(countSql, params);
  await cache.set(cacheKey, total, { ttl: 60 }); // 1분 캐시
}
```

3. **Materialized View** (복잡한 집계):
```sql
CREATE MATERIALIZED VIEW feedback_stats AS
SELECT
  project_id,
  status,
  COUNT(*) as count
FROM feedback
GROUP BY project_id, status;

-- 주기적 갱신
REFRESH MATERIALIZED VIEW CONCURRENTLY feedback_stats;
```

### 3.2 N+1 쿼리 [Good]

- 현재 코드에서는 N+1 문제가 발견되지 않음
- JOIN과 서브쿼리를 적절히 사용하고 있음
- `getFeedbackWithReplies`에서 Promise.all로 병렬 처리

### 3.3 json_build_object 서브쿼리 [Medium]

**현황**: `organization.ts:128-160`

```sql
COALESCE(
  (SELECT json_agg(json_build_object(...))
   FROM project p WHERE p.organization_id = o.id
  ), '[]'::json
) as projects
```

**문제점**:
- 각 행마다 서브쿼리 실행
- 조직당 프로젝트/멤버가 많으면 성능 저하

**권장사항**:
- 현재 규모에서는 문제없음
- 성능 이슈 발생 시 LATERAL JOIN 또는 별도 쿼리로 분리

### 3.4 ORDER BY 동적 생성 [Good]

**현황**: `feedback.ts:193`

```typescript
ORDER BY ${orderColumn} ${order.toUpperCase()}
```

**분석**:
- `orderColumn`은 하드코딩된 값만 사용 ("created_at", "updated_at", "priority")
- `order`는 enum ("asc", "desc")
- SQL 인젝션 위험 없음

---

## 4. 커넥션 풀 관리 [High]

### 4.1 현재 설정

**현황**: `client.ts`

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**문제점**:
- 기본 설정만 사용
- max, min, idle 타임아웃 미설정
- 서버리스 환경에서 커넥션 고갈 위험

**권장사항**:

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // 커넥션 풀 크기
  max: 20,                    // 최대 커넥션 수
  min: 2,                     // 최소 유지 커넥션

  // 타임아웃 설정
  idleTimeoutMillis: 30000,   // 유휴 커넥션 타임아웃 (30초)
  connectionTimeoutMillis: 5000, // 커넥션 획득 타임아웃 (5초)

  // 서버리스 환경용
  allowExitOnIdle: true,      // 모든 커넥션 유휴 시 프로세스 종료 허용
});

// 에러 핸들링
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // 모니터링 시스템에 알림
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
});
```

### 4.2 Supabase 권장 설정

Supabase 사용 시:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Supabase Free tier: 60 connections 제한
  ssl: {
    rejectUnauthorized: false, // Supabase SSL
  },
});
```

---

## 5. 트랜잭션 관리 [High]

### 5.1 현재 사용 현황

**트랜잭션 사용**: `organization.ts:30-72` (createOrganization만)

```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... 작업
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

### 5.2 트랜잭션 필요 작업 [High]

다음 작업들에 트랜잭션이 필요:

#### 프로젝트 삭제

```typescript
// 현재: CASCADE로 자동 삭제
await query("DELETE FROM project WHERE id = $1", [id]);

// 권장: 명시적 트랜잭션 + 소프트 삭제 고려
export async function deleteProject(id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 관련 알림 설정 삭제
    await client.query(
      "DELETE FROM project_notification_setting WHERE project_id = $1",
      [id]
    );

    // 감사 로그 기록 (선택)
    await client.query(
      "INSERT INTO audit_log (action, entity_type, entity_id) VALUES ($1, $2, $3)",
      ["DELETE", "project", id]
    );

    // 프로젝트 삭제
    await client.query("DELETE FROM project WHERE id = $1", [id]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

#### 피드백 상태 변경 + 알림

```typescript
// 현재: 별도 작업
await updateFeedbackStatus({ id, status });
await sendNotification(...); // 실패해도 롤백 안됨

// 권장: 중요도에 따라 트랜잭션 또는 이벤트 기반 처리
```

### 5.3 트랜잭션 헬퍼 함수 권장

```typescript
// client.ts에 추가
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// 사용 예시
const org = await withTransaction(async (client) => {
  const org = await client.query("INSERT INTO organization ...");
  await client.query("INSERT INTO organization_member ...");
  return org.rows[0];
});
```

---

## 6. 보안 검토 [Good]

### 6.1 SQL 인젝션 방어 [Good]

- 모든 쿼리가 매개변수화됨 (`$1`, `$2`, ...)
- 동적 SQL은 하드코딩된 값만 사용
- Zod를 통한 입력값 검증

### 6.2 민감 데이터 [Medium]

**확인 필요 사항**:

| 컬럼 | 현재 | 권장 |
|------|------|------|
| account.password | TEXT (해시됨) | 암호화 확인 필요 |
| account.access_token | TEXT | 암호화 고려 |
| account.refresh_token | TEXT | 암호화 고려 |
| organization.api_key | TEXT | 접근 제한 확인 |
| project.api_key | TEXT | 접근 제한 확인 |

**권장사항**:
- 토큰 암호화: `pgcrypto` 확장 사용
- API 키 해싱: 저장 시 해시, 비교 시 해시 비교

```sql
-- API 키 해시 저장 예시
UPDATE project SET api_key_hash = encode(sha256(api_key::bytea), 'hex');
```

### 6.3 Row Level Security (RLS) [Low]

Supabase 사용 시 RLS 활성화 권장:

```sql
-- 예시: feedback 테이블 RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's feedback"
  ON feedback FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM project p
      JOIN organization_member om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );
```

---

## 7. 데이터 무결성 [Medium]

### 7.1 누락된 제약조건

#### reply.author_id FK 누락

```sql
-- 현재
"author_id" TEXT,

-- 권장: author_type이 'ADMIN'인 경우 user 참조
ALTER TABLE reply ADD CONSTRAINT reply_author_fk
  FOREIGN KEY (author_id) REFERENCES "user"(id) ON DELETE SET NULL;
```

#### 이메일 형식 검증

```sql
-- 애플리케이션 레벨에서만 검증 중
-- DB 레벨 검증 추가 권장

ALTER TABLE feedback ADD CONSTRAINT feedback_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE "user" ADD CONSTRAINT user_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

#### 메시지 길이 제한

```sql
-- 현재 애플리케이션에서 5000자 제한
ALTER TABLE feedback ADD CONSTRAINT feedback_message_length
  CHECK (length(message) <= 5000);

ALTER TABLE reply ADD CONSTRAINT reply_content_length
  CHECK (length(content) <= 10000);
```

### 7.2 updated_at 자동 갱신

**현황**: 애플리케이션에서 수동 설정

**권장**: 트리거 사용

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_updated_at
  BEFORE UPDATE ON organization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 다른 테이블에도 동일하게 적용
```

---

## 8. 확장성 [Medium]

### 8.1 파티셔닝 [Medium]

**대상**: feedback 테이블 (가장 빠르게 증가)

```sql
-- 월별 파티셔닝
CREATE TABLE feedback (
  id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ... 다른 컬럼들
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 월별 파티션 생성
CREATE TABLE feedback_2026_01 PARTITION OF feedback
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**적용 시점**: 피드백 100만 건 이상 예상 시

### 8.2 아카이빙 전략 [Low]

**권장**:
- 1년 이상 된 피드백 → 아카이브 테이블 이동
- 3년 이상 → 콜드 스토리지 (S3 등)

```sql
-- 아카이브 테이블
CREATE TABLE feedback_archive (LIKE feedback INCLUDING ALL);

-- 아카이브 작업 (월별 배치)
INSERT INTO feedback_archive
SELECT * FROM feedback
WHERE created_at < now() - interval '1 year';

DELETE FROM feedback
WHERE created_at < now() - interval '1 year';
```

### 8.3 Read Replica [Low]

**권장**:
- 읽기 트래픽이 많아지면 Read Replica 도입
- Supabase에서 지원 (Pro 플랜 이상)

```typescript
const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL,
});

// 읽기 전용 쿼리
export async function queryRead<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await readPool.query(text, params);
  return result.rows as T[];
}
```

---

## 9. 마이그레이션 관리 [High]

### 9.1 현재 상황

**문제점**:
- 마이그레이션 도구 미사용
- 버전 관리 없음
- 스키마 변경 이력 추적 불가

### 9.2 권장사항

**도구 도입**:
```bash
pnpm add -D postgres-migrations
# 또는
pnpm add -D drizzle-kit
```

**마이그레이션 폴더 구조**:
```
packages/database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_feedback_indexes.sql
│   ├── 003_add_project_notification.sql
│   └── ...
├── src/
│   └── migrate.ts
```

**마이그레이션 스크립트**:
```typescript
// migrate.ts
import { migrate } from "postgres-migrations";
import { pool } from "./client";

async function runMigrations() {
  const client = await pool.connect();
  try {
    await migrate({ client }, "./migrations");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
```

**package.json 스크립트**:
```json
{
  "scripts": {
    "db:migrate": "tsx src/migrate.ts",
    "db:migrate:create": "touch migrations/$(date +%Y%m%d%H%M%S)_new_migration.sql"
  }
}
```

---

## 10. 모니터링 [Medium]

### 10.1 권장 모니터링 항목

| 항목 | 쿼리/방법 | 임계값 |
|------|---------|--------|
| 슬로우 쿼리 | pg_stat_statements | > 1초 |
| 커넥션 수 | pg_stat_activity | max의 80% |
| 테이블 크기 | pg_total_relation_size | - |
| 인덱스 사용률 | pg_stat_user_indexes | < 50% |
| 데드 튜플 | pg_stat_user_tables | > 10% |

### 10.2 슬로우 쿼리 로깅

```sql
-- PostgreSQL 설정
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1초 이상
ALTER SYSTEM SET log_statement = 'all'; -- 개발 환경
SELECT pg_reload_conf();
```

### 10.3 Supabase 대시보드 활용

- Database → Query Performance
- Reports → Slow Queries
- Logs Explorer

---

## 11. 즉시 조치 필요 항목

### 11.1 Priority 1 (Critical)

없음

### 11.2 Priority 2 (High)

1. **커넥션 풀 설정 추가**
   - max, idle 타임아웃 설정
   - 에러 핸들링 추가

2. **누락된 인덱스 추가**
   - feedback_email_idx
   - feedback_type_idx
   - account_provider_account_idx

3. **마이그레이션 도구 도입**
   - postgres-migrations 또는 drizzle-kit

### 11.3 Priority 3 (Medium)

1. Full Text Search 인덱스 추가
2. COUNT(*) 캐싱
3. 트랜잭션 헬퍼 함수 추가
4. updated_at 트리거 추가

---

## 12. 추가 권장 SQL

### 12.1 즉시 적용 가능한 인덱스

```sql
-- 피드백 검색/필터링 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS feedback_email_idx
  ON feedback(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS feedback_type_idx
  ON feedback(type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS feedback_project_status_created_idx
  ON feedback(project_id, status, created_at DESC);

-- OAuth 로그인 최적화
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS account_provider_account_idx
  ON account(provider_id, account_id);

-- 토큰 조회 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS verification_token_idx
  ON verification(token);
```

### 12.2 데이터 무결성 강화

```sql
-- 메시지 길이 제한
ALTER TABLE feedback
  ADD CONSTRAINT IF NOT EXISTS feedback_message_length
  CHECK (length(message) <= 5000);

ALTER TABLE reply
  ADD CONSTRAINT IF NOT EXISTS reply_content_length
  CHECK (length(content) <= 10000);
```

---

## 13. 결론

Sori 프로젝트의 데이터베이스 아키텍처는 전반적으로 양호합니다. 주요 개선 사항:

1. **즉시 필요**: 커넥션 풀 설정, 누락된 인덱스
2. **단기**: 마이그레이션 도구 도입, 트랜잭션 헬퍼
3. **중기**: Full Text Search, COUNT 캐싱
4. **장기**: 파티셔닝, 아카이빙 전략

현재 규모에서는 큰 문제가 없지만, 피드백 데이터가 증가함에 따라 위 권장사항들을 순차적으로 적용하는 것이 좋습니다.

import { Pool, type PoolClient } from "pg";
import { randomBytes } from "crypto";

// ============ Performance Logging ============
const perfConfig = {
  enabled: process.env.PERF_LOGGING === "true",
  slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_MS || "100", 10),
  logAllQueries: process.env.PERF_LOG_ALL === "true",
};

function logPerf(entry: {
  type: string;
  name: string;
  ms: number;
  rows?: number;
  error?: boolean;
}) {
  if (!perfConfig.enabled) return;
  const isSlow = entry.ms >= perfConfig.slowQueryThresholdMs;
  if (!perfConfig.logAllQueries && !isSlow) return;
  const prefix = isSlow ? "[SLOW]" : "[PERF]";
  console.log(`${prefix} ${JSON.stringify(entry)}`);
}

function getQuerySnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}
// ============================================

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,

    // 커넥션 풀 크기 (Supabase Free: 60 connections 제한)
    max: 10,
    min: 2,

    // 타임아웃 설정
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,

    // 서버리스 환경용
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

// 에러 핸들링
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
});

// Helper function for queries
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  if (!perfConfig.enabled) {
    const result = await pool.query(text, params);
    return result.rows as T[];
  }

  const start = performance.now();
  const result = await pool.query(text, params);
  const ms = Math.round((performance.now() - start) * 100) / 100;
  logPerf({
    type: "db_query",
    name: getQuerySnippet(text),
    ms,
    rows: result.rowCount ?? 0,
  });
  return result.rows as T[];
}

// Helper function for single row queries
export async function queryOne<T>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  if (!perfConfig.enabled) {
    const result = await pool.query(text, params);
    return (result.rows[0] as T) ?? null;
  }

  const start = performance.now();
  const result = await pool.query(text, params);
  const ms = Math.round((performance.now() - start) * 100) / 100;
  logPerf({
    type: "db_query",
    name: getQuerySnippet(text),
    ms,
    rows: result.rowCount ?? 0,
  });
  return (result.rows[0] as T) ?? null;
}

// Helper function for insert/update with RETURNING
export async function queryReturning<T>(
  text: string,
  params?: unknown[]
): Promise<T> {
  if (!perfConfig.enabled) {
    const result = await pool.query(text, params);
    return result.rows[0] as T;
  }

  const start = performance.now();
  const result = await pool.query(text, params);
  const ms = Math.round((performance.now() - start) * 100) / 100;
  logPerf({
    type: "db_query",
    name: getQuerySnippet(text),
    ms,
    rows: result.rowCount ?? 0,
  });
  return result.rows[0] as T;
}

// 트랜잭션 헬퍼 함수
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const start = perfConfig.enabled ? performance.now() : 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    if (perfConfig.enabled) {
      const ms = Math.round((performance.now() - start) * 100) / 100;
      logPerf({ type: "db_tx", name: "transaction", ms });
    }
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if (perfConfig.enabled) {
      const ms = Math.round((performance.now() - start) * 100) / 100;
      logPerf({ type: "db_tx", name: "transaction", ms, error: true });
    }
    throw error;
  } finally {
    client.release();
  }
}

// Generate CUID-like ID (crypto-safe)
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString("base64url");
  return `c${timestamp}${randomPart}`;
}

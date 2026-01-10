import { Pool, PoolClient } from "pg";
import { randomBytes } from "crypto";

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
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper function for single row queries
export async function queryOne<T>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) ?? null;
}

// Helper function for insert/update with RETURNING
export async function queryReturning<T>(
  text: string,
  params?: unknown[]
): Promise<T> {
  const result = await pool.query(text, params);
  return result.rows[0] as T;
}

// 트랜잭션 헬퍼 함수
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

// Generate CUID-like ID (crypto-safe)
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString("base64url");
  return `c${timestamp}${randomPart}`;
}

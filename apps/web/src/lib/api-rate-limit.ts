// ============================================
// API 키 기반 Rate Limiting
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number; // 시간 윈도우 (ms)
  maxRequests: number; // 최대 요청 수
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000, // 1분
  maxRequests: 100, // 100 requests per minute
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkApiRateLimit(
  apiKey: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(apiKey);

  // 새 엔트리 또는 만료된 엔트리
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(apiKey, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Rate limit 초과
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  // 정상 요청
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetTime,
  };
}

// 주기적으로 만료된 엔트리 정리 (메모리 관리)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // 1분마다 정리

/**
 * Rate limiting utilities for public API
 *
 * Uses in-memory storage (per-instance).
 * For distributed systems, consider Redis-based rate limiting.
 */

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Creates a rate limiter with configurable limits
 *
 * @param config - Rate limit configuration
 * @param storage - Optional Map storage (for testing)
 * @param getNow - Optional time function (for testing)
 */
export function createRateLimiter(
  config: RateLimitConfig,
  storage: Map<string, RateLimitEntry> = new Map(),
  getNow: () => number = Date.now
) {
  const { windowMs, maxRequests } = config;

  /**
   * Checks if a request is allowed and updates the counter
   */
  function check(key: string): RateLimitResult {
    const now = getNow();
    const entry = storage.get(key);

    // No entry or window expired - create new entry
    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      storage.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: resetTime,
      };
    }

    // Within window and under limit
    if (entry.count < maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetAt: entry.resetTime,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  /**
   * Cleans up expired entries
   */
  function cleanup(): void {
    const now = getNow();
    for (const [key, entry] of storage) {
      if (now > entry.resetTime) {
        storage.delete(key);
      }
    }
  }

  /**
   * Resets rate limit for a specific key
   */
  function reset(key: string): void {
    storage.delete(key);
  }

  /**
   * Clears all rate limit entries
   */
  function clear(): void {
    storage.clear();
  }

  return {
    check,
    cleanup,
    reset,
    clear,
  };
}

// Default configurations
export const RATE_LIMIT_CONFIGS = {
  // Widget feedback submission (IP-based)
  feedbackSubmission: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  // Ticket page views (IP-based)
  ticketView: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Customer replies (IP+token-based)
  ticketReply: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 replies per minute
  },
  // Authenticated API endpoints (API key-based)
  apiKey: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
} as const;

// Singleton rate limiter for API key-authenticated endpoints
export const apiKeyLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.apiKey);
setInterval(() => apiKeyLimiter.cleanup(), 60000);

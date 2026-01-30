import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter, type RateLimitEntry } from "./rate-limit.ts";

describe("createRateLimiter", () => {
  const defaultConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  };

  let storage: Map<string, RateLimitEntry>;
  let currentTime: number;

  beforeEach(() => {
    storage = new Map();
    currentTime = 1000000; // Fixed starting time
  });

  const getNow = () => currentTime;

  describe("check", () => {
    it("should allow first request", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);
      const result = limiter.check("user-1");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("should allow requests within limit", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      for (let i = 0; i < 10; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it("should deny request when limit exceeded", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        limiter.check("user-1");
      }

      // 11th request should be denied
      const result = limiter.check("user-1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should track different keys independently", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      // Exhaust limit for user-1
      for (let i = 0; i < 10; i++) {
        limiter.check("user-1");
      }

      // user-2 should still be allowed
      const result = limiter.check("user-2");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("should reset after window expires", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        limiter.check("user-1");
      }

      // Advance time past the window
      currentTime += 60001; // 1ms past window

      // Should be allowed again
      const result = limiter.check("user-1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("should return correct resetTime", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);
      const result = limiter.check("user-1");

      expect(result.resetAt).toBe(currentTime + 60000);
    });

    it("should maintain resetTime within window", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);
      const firstResult = limiter.check("user-1");

      // Advance time but stay within window
      currentTime += 30000;

      const secondResult = limiter.check("user-1");
      expect(secondResult.resetAt).toBe(firstResult.resetAt);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      limiter.check("user-1");
      limiter.check("user-2");
      expect(storage.size).toBe(2);

      // Advance time past window
      currentTime += 60001;

      limiter.cleanup();
      expect(storage.size).toBe(0);
    });

    it("should keep non-expired entries", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      limiter.check("user-1");

      // Advance time but stay within window
      currentTime += 30000;
      limiter.check("user-2");

      // Advance time to expire user-1 but not user-2
      currentTime += 35000;

      limiter.cleanup();
      expect(storage.size).toBe(1);
      expect(storage.has("user-2")).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset specific key", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      limiter.check("user-1");
      limiter.check("user-2");
      expect(storage.size).toBe(2);

      limiter.reset("user-1");
      expect(storage.size).toBe(1);
      expect(storage.has("user-1")).toBe(false);
      expect(storage.has("user-2")).toBe(true);
    });
  });

  describe("clear", () => {
    it("should clear all entries", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      limiter.check("user-1");
      limiter.check("user-2");
      limiter.check("user-3");

      limiter.clear();
      expect(storage.size).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle maxRequests of 1", () => {
      const limiter = createRateLimiter(
        { windowMs: 60000, maxRequests: 1 },
        storage,
        getNow
      );

      const first = limiter.check("user-1");
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(0);

      const second = limiter.check("user-1");
      expect(second.allowed).toBe(false);
    });

    it("should handle very short window", () => {
      const limiter = createRateLimiter(
        { windowMs: 100, maxRequests: 5 },
        storage,
        getNow
      );

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.check("user-1");
      }

      // 6th should be denied
      expect(limiter.check("user-1").allowed).toBe(false);

      // Advance past window
      currentTime += 101;

      // Should be allowed again
      expect(limiter.check("user-1").allowed).toBe(true);
    });

    it("should handle request at exact window boundary", () => {
      const limiter = createRateLimiter(defaultConfig, storage, getNow);

      limiter.check("user-1");

      // Advance to exact window boundary
      currentTime += 60000;

      // At exact boundary, should still be in old window
      const result = limiter.check("user-1");
      expect(result.remaining).toBe(8); // Still counting in old window
    });
  });
});

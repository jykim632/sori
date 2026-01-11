import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isTokenExpired } from "./feedback.ts";
import type { Feedback } from "../types.ts";

// Mock feedback factory
function createMockFeedback(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: "test-id",
    type: "BUG",
    message: "Test message",
    email: "test@example.com",
    status: "OPEN",
    priority: null,
    metadata: null,
    projectId: "project-id",
    token: "test-token",
    tokenAccessedAt: null,
    privacyAgreedAt: null,
    createdAt: new Date(),
    resolvedAt: null,
    ...overrides,
  };
}

describe("isTokenExpired", () => {
  beforeEach(() => {
    // Use fake timers for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return false for newly created feedback", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    vi.setSystemTime(now);

    const feedback = createMockFeedback({
      createdAt: now,
      tokenAccessedAt: null,
    });

    expect(isTokenExpired(feedback)).toBe(false);
  });

  it("should return false for feedback accessed 5 months ago", () => {
    const now = new Date("2026-06-10T00:00:00Z");
    vi.setSystemTime(now);

    const accessedAt = new Date("2026-01-10T00:00:00Z"); // 5 months ago
    const feedback = createMockFeedback({
      createdAt: new Date("2025-12-01T00:00:00Z"),
      tokenAccessedAt: accessedAt,
    });

    expect(isTokenExpired(feedback)).toBe(false);
  });

  it("should return true for feedback accessed 7 months ago", () => {
    const now = new Date("2026-08-10T00:00:00Z");
    vi.setSystemTime(now);

    const accessedAt = new Date("2026-01-10T00:00:00Z"); // 7 months ago
    const feedback = createMockFeedback({
      createdAt: new Date("2025-12-01T00:00:00Z"),
      tokenAccessedAt: accessedAt,
    });

    expect(isTokenExpired(feedback)).toBe(true);
  });

  it("should use createdAt when tokenAccessedAt is null", () => {
    const now = new Date("2026-08-10T00:00:00Z");
    vi.setSystemTime(now);

    const createdAt = new Date("2026-01-10T00:00:00Z"); // 7 months ago
    const feedback = createMockFeedback({
      createdAt,
      tokenAccessedAt: null,
    });

    expect(isTokenExpired(feedback)).toBe(true);
  });

  it("should return false at exactly 6 months boundary", () => {
    // Set current time to exactly 6 months after creation
    const createdAt = new Date("2026-01-10T00:00:00Z");
    const sixMonthsLater = new Date("2026-07-10T00:00:00Z");
    vi.setSystemTime(sixMonthsLater);

    const feedback = createMockFeedback({
      createdAt,
      tokenAccessedAt: null,
    });

    // At exactly 6 months, should not be expired yet
    expect(isTokenExpired(feedback)).toBe(false);
  });

  it("should return true one day after 6 months", () => {
    const createdAt = new Date("2026-01-10T00:00:00Z");
    const oneDayAfterSixMonths = new Date("2026-07-11T00:00:00Z");
    vi.setSystemTime(oneDayAfterSixMonths);

    const feedback = createMockFeedback({
      createdAt,
      tokenAccessedAt: null,
    });

    expect(isTokenExpired(feedback)).toBe(true);
  });

  it("should prefer tokenAccessedAt over createdAt", () => {
    const now = new Date("2026-06-10T00:00:00Z");
    vi.setSystemTime(now);

    // Created 8 months ago (would be expired if using createdAt)
    const createdAt = new Date("2025-10-10T00:00:00Z");
    // But accessed 3 months ago (not expired)
    const tokenAccessedAt = new Date("2026-03-10T00:00:00Z");

    const feedback = createMockFeedback({
      createdAt,
      tokenAccessedAt,
    });

    expect(isTokenExpired(feedback)).toBe(false);
  });
});

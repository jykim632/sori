import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isTokenExpired } from "./feedback.ts";
import type { Feedback, FeedbackWithProject, Project } from "../types.ts";

// Mock client module
vi.mock("../client.ts", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryReturning: vi.fn(),
  generateId: vi.fn(() => "mock-id"),
}));

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

// ============================================
// Window 함수 페이지네이션 테스트
// ============================================

const mockProject: Project = {
  id: "proj-1",
  name: "Test Project",
  allowedOrigins: [],
  widgetConfig: null,
  organizationId: "org-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function createMockFeedbackWithProject(
  overrides: Partial<FeedbackWithProject & { totalCount: string }> = {},
): FeedbackWithProject & { totalCount: string } {
  return {
    ...createMockFeedback(),
    project: mockProject,
    totalCount: "1",
    ...overrides,
  };
}

describe("getFeedbacksFiltered", () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const client = await import("../client.ts");
    mockQuery = client.query as ReturnType<typeof vi.fn>;
    mockQuery.mockReset();
  });

  it("should return correct pagination from window function totalCount", async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      createMockFeedbackWithProject({
        id: `fb-${i}`,
        totalCount: "25",
      }),
    );
    mockQuery.mockResolvedValue(rows);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    const result = await getFeedbacksFiltered({
      organizationId: "org-1",
      page: 1,
      limit: 20,
    });

    expect(result.pagination.total).toBe(25);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
  });

  it("should strip totalCount from returned data", async () => {
    const rows = [createMockFeedbackWithProject({ totalCount: "5" })];
    mockQuery.mockResolvedValue(rows);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    const result = await getFeedbacksFiltered({ organizationId: "org-1" });

    const item = result.data[0] as Record<string, unknown>;
    expect(item.totalCount).toBeUndefined();
    expect(item.id).toBeDefined();
    expect(item.project).toBeDefined();
  });

  it("should return total 0 when no results", async () => {
    mockQuery.mockResolvedValue([]);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    const result = await getFeedbacksFiltered({ organizationId: "org-1" });

    expect(result.data).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it("should call query exactly once (no separate count query)", async () => {
    mockQuery.mockResolvedValue([]);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    await getFeedbacksFiltered({ organizationId: "org-1" });

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("should include COUNT(*) OVER() in SQL", async () => {
    mockQuery.mockResolvedValue([]);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    await getFeedbacksFiltered({ organizationId: "org-1" });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('COUNT(*) OVER() as "totalCount"');
  });

  it("should calculate totalPages correctly for exact page boundary", async () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      createMockFeedbackWithProject({ id: `fb-${i}`, totalCount: "40" }),
    );
    mockQuery.mockResolvedValue(rows);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    const result = await getFeedbacksFiltered({
      organizationId: "org-1",
      page: 1,
      limit: 20,
    });

    expect(result.pagination.totalPages).toBe(2);
  });

  it("should calculate totalPages correctly for non-exact boundary", async () => {
    const rows = [createMockFeedbackWithProject({ totalCount: "21" })];
    mockQuery.mockResolvedValue(rows);

    const { getFeedbacksFiltered } = await import("./feedback.ts");
    const result = await getFeedbacksFiltered({
      organizationId: "org-1",
      page: 2,
      limit: 20,
    });

    expect(result.pagination.totalPages).toBe(2);
  });
});

describe("getFeedbacksWithPagination", () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const client = await import("../client.ts");
    mockQuery = client.query as ReturnType<typeof vi.fn>;
    mockQuery.mockReset();
  });

  it("should return correct pagination from window function totalCount", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ...createMockFeedback({ id: `fb-${i}` }),
      totalCount: "50",
    }));
    mockQuery.mockResolvedValue(rows);

    const { getFeedbacksWithPagination } = await import("./feedback.ts");
    const result = await getFeedbacksWithPagination({
      projectId: "proj-1",
      page: 1,
      limit: 20,
    });

    expect(result.pagination.total).toBe(50);
    expect(result.pagination.totalPages).toBe(3);
  });

  it("should strip totalCount from returned data", async () => {
    const rows = [{ ...createMockFeedback(), totalCount: "1" }];
    mockQuery.mockResolvedValue(rows);

    const { getFeedbacksWithPagination } = await import("./feedback.ts");
    const result = await getFeedbacksWithPagination({ projectId: "proj-1" });

    const item = result.data[0] as Record<string, unknown>;
    expect(item.totalCount).toBeUndefined();
  });

  it("should return total 0 when no results", async () => {
    mockQuery.mockResolvedValue([]);

    const { getFeedbacksWithPagination } = await import("./feedback.ts");
    const result = await getFeedbacksWithPagination({ projectId: "proj-1" });

    expect(result.data).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it("should call query exactly once", async () => {
    mockQuery.mockResolvedValue([]);

    const { getFeedbacksWithPagination } = await import("./feedback.ts");
    await getFeedbacksWithPagination({ projectId: "proj-1" });

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("should include COUNT(*) OVER() in SQL", async () => {
    mockQuery.mockResolvedValue([]);

    const { getFeedbacksWithPagination } = await import("./feedback.ts");
    await getFeedbacksWithPagination({ projectId: "proj-1" });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('COUNT(*) OVER() as "totalCount"');
  });
});

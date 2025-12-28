import { query, queryOne, queryReturning, generateId } from "../client.ts";
import type {
  Feedback,
  FeedbackWithProject,
  FeedbackWithReplies,
  FeedbackType,
  FeedbackStatus,
  Priority,
  Reply,
} from "../types.ts";

interface GetFeedbacksOptions {
  projectId?: string;
  organizationId?: string;
}

export async function getFeedbacks(
  options: GetFeedbacksOptions
): Promise<FeedbackWithProject[]> {
  const { projectId, organizationId } = options;

  let sql = `
    SELECT
      f.id, f.type, f.message, f.email, f.status, f.priority, f.metadata,
      f.project_id as "projectId", f.created_at as "createdAt", f.resolved_at as "resolvedAt",
      json_build_object(
        'id', p.id,
        'name', p.name,
        'allowedOrigins', p.allowed_origins,
        'widgetConfig', p.widget_config,
        'organizationId', p.organization_id,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at
      ) as project
    FROM feedback f
    JOIN project p ON f.project_id = p.id
    WHERE 1=1
  `;

  const params: unknown[] = [];
  let paramIndex = 1;

  if (projectId) {
    sql += ` AND f.project_id = $${paramIndex++}`;
    params.push(projectId);
  }

  if (organizationId) {
    sql += ` AND p.organization_id = $${paramIndex++}`;
    params.push(organizationId);
  }

  sql += ` ORDER BY f.created_at DESC`;

  return query<FeedbackWithProject>(sql, params);
}

interface CreateFeedbackInput {
  type: FeedbackType;
  message: string;
  email?: string | null;
  projectId: string;
  metadata?: Record<string, unknown> | null;
}

export async function createFeedback(input: CreateFeedbackInput): Promise<Feedback> {
  const { type, message, email, projectId, metadata } = input;
  const id = generateId();

  const sql = `
    INSERT INTO feedback (id, type, message, email, project_id, metadata, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', now())
    RETURNING
      id, type, message, email, status, priority, metadata,
      project_id as "projectId", created_at as "createdAt", resolved_at as "resolvedAt"
  `;

  return queryReturning<Feedback>(sql, [
    id,
    type,
    message,
    email ?? null,
    projectId,
    metadata ? JSON.stringify(metadata) : null,
  ]);
}

interface UpdateFeedbackStatusInput {
  id: string;
  status: FeedbackStatus;
}

export async function updateFeedbackStatus(
  input: UpdateFeedbackStatusInput
): Promise<Feedback> {
  const { id, status } = input;
  const resolvedAt = status === "RESOLVED" || status === "CLOSED" ? "now()" : "NULL";

  const sql = `
    UPDATE feedback
    SET status = $1, resolved_at = ${resolvedAt}
    WHERE id = $2
    RETURNING
      id, type, message, email, status, priority, metadata,
      project_id as "projectId", created_at as "createdAt", resolved_at as "resolvedAt"
  `;

  return queryReturning<Feedback>(sql, [status, id]);
}

// ============================================
// Public API용 확장 함수
// ============================================

interface GetFeedbacksWithPaginationOptions {
  projectId: string;
  status?: FeedbackStatus;
  type?: FeedbackType;
  priority?: Priority;
  page?: number;
  limit?: number;
  orderBy?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getFeedbacksWithPagination(
  options: GetFeedbacksWithPaginationOptions
): Promise<PaginatedResult<Feedback>> {
  const {
    projectId,
    status,
    type,
    priority,
    page = 1,
    limit = 20,
    orderBy = "createdAt",
    order = "desc",
  } = options;

  // Build WHERE conditions
  const conditions: string[] = ["project_id = $1"];
  const params: unknown[] = [projectId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (type) {
    conditions.push(`type = $${paramIndex++}`);
    params.push(type);
  }

  if (priority) {
    conditions.push(`priority = $${paramIndex++}`);
    params.push(priority);
  }

  const whereClause = conditions.join(" AND ");

  // Count query
  const countSql = `SELECT COUNT(*) as total FROM feedback WHERE ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || "0", 10);

  // Data query
  const orderColumn = orderBy === "updatedAt" ? "updated_at" : "created_at";
  const offset = (page - 1) * limit;

  const dataSql = `
    SELECT
      id, type, message, email, status, priority, metadata,
      project_id as "projectId", created_at as "createdAt", resolved_at as "resolvedAt"
    FROM feedback
    WHERE ${whereClause}
    ORDER BY ${orderColumn} ${order.toUpperCase()}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;

  const data = await query<Feedback>(dataSql, [...params, limit, offset]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// 단일 피드백 조회 (with replies)
export async function getFeedbackWithReplies(
  id: string
): Promise<FeedbackWithReplies | null> {
  const feedbackSql = `
    SELECT
      id, type, message, email, status, priority, metadata,
      project_id as "projectId", created_at as "createdAt", resolved_at as "resolvedAt"
    FROM feedback
    WHERE id = $1
  `;

  const repliesSql = `
    SELECT
      id, content, feedback_id as "feedbackId",
      author_id as "authorId", author_name as "authorName",
      author_type as "authorType", is_internal as "isInternal",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reply
    WHERE feedback_id = $1
    ORDER BY created_at ASC
  `;

  const [feedback, replies] = await Promise.all([
    queryOne<Feedback>(feedbackSql, [id]),
    query<Reply>(repliesSql, [id]),
  ]);

  if (!feedback) return null;

  return { ...feedback, replies };
}

// 피드백 업데이트 (status + priority)
interface UpdateFeedbackInput {
  id: string;
  status?: FeedbackStatus;
  priority?: Priority | null;
}

export async function updateFeedback(input: UpdateFeedbackInput): Promise<Feedback> {
  const { id, status, priority } = input;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);

    if (status === "RESOLVED" || status === "CLOSED") {
      updates.push(`resolved_at = now()`);
    } else {
      updates.push(`resolved_at = NULL`);
    }
  }

  if (priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(priority);
  }

  if (updates.length === 0) {
    // Nothing to update, return current feedback
    const current = await queryOne<Feedback>(
      `SELECT id, type, message, email, status, priority, metadata,
       project_id as "projectId", created_at as "createdAt", resolved_at as "resolvedAt"
       FROM feedback WHERE id = $1`,
      [id]
    );
    if (!current) throw new Error("Feedback not found");
    return current;
  }

  params.push(id);

  const sql = `
    UPDATE feedback
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING
      id, type, message, email, status, priority, metadata,
      project_id as "projectId", created_at as "createdAt", resolved_at as "resolvedAt"
  `;

  return queryReturning<Feedback>(sql, params);
}

// ============================================
// 어드민용 필터링 + 페이지네이션
// ============================================

type OrderBy = "createdAt" | "priority";
type Order = "asc" | "desc";

interface GetFeedbacksFilteredOptions {
  organizationId: string;
  projectId?: string;
  status?: FeedbackStatus;
  type?: FeedbackType;
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  orderBy?: OrderBy;
  order?: Order;
  page?: number;
  limit?: number;
}

interface FilteredPaginatedResult {
  data: FeedbackWithProject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getFeedbacksFiltered(
  options: GetFeedbacksFilteredOptions
): Promise<FilteredPaginatedResult> {
  const {
    organizationId,
    projectId,
    status,
    type,
    search,
    dateFrom,
    dateTo,
    orderBy = "createdAt",
    order = "desc",
    page = 1,
    limit = 20,
  } = options;

  // Build WHERE conditions
  const conditions: string[] = ["p.organization_id = $1"];
  const params: unknown[] = [organizationId];
  let paramIndex = 2;

  if (projectId) {
    conditions.push(`f.project_id = $${paramIndex++}`);
    params.push(projectId);
  }

  if (status) {
    conditions.push(`f.status = $${paramIndex++}`);
    params.push(status);
  }

  if (type) {
    conditions.push(`f.type = $${paramIndex++}`);
    params.push(type);
  }

  if (search) {
    conditions.push(`(f.message ILIKE $${paramIndex} OR f.email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (dateFrom) {
    conditions.push(`f.created_at::date >= $${paramIndex++}::date`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`f.created_at::date <= $${paramIndex++}::date`);
    params.push(dateTo);
  }

  const whereClause = conditions.join(" AND ");

  // Count query
  const countSql = `
    SELECT COUNT(*) as total
    FROM feedback f
    JOIN project p ON f.project_id = p.id
    WHERE ${whereClause}
  `;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || "0", 10);

  // Build ORDER BY clause
  let orderClause: string;
  if (orderBy === "priority") {
    orderClause = `f.priority ${order.toUpperCase()} NULLS LAST, f.created_at DESC`;
  } else {
    orderClause = `f.created_at ${order.toUpperCase()}`;
  }

  // Data query
  const offset = (page - 1) * limit;

  const dataSql = `
    SELECT
      f.id, f.type, f.message, f.email, f.status, f.priority, f.metadata,
      f.project_id as "projectId", f.created_at as "createdAt", f.resolved_at as "resolvedAt",
      json_build_object(
        'id', p.id,
        'name', p.name,
        'allowedOrigins', p.allowed_origins,
        'widgetConfig', p.widget_config,
        'organizationId', p.organization_id,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at
      ) as project
    FROM feedback f
    JOIN project p ON f.project_id = p.id
    WHERE ${whereClause}
    ORDER BY ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;

  const data = await query<FeedbackWithProject>(dataSql, [...params, limit, offset]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

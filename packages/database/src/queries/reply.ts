import { query, queryOne, queryReturning, generateId } from "../client.ts";
import type { Reply, AuthorType } from "../types.ts";

interface CreateReplyInput {
  feedbackId: string;
  content: string;
  authorId?: string | null;
  authorName?: string | null;
  authorType: AuthorType;
  isInternal?: boolean;
}

export async function createReply(input: CreateReplyInput): Promise<Reply> {
  const {
    feedbackId,
    content,
    authorId = null,
    authorName = null,
    authorType,
    isInternal = false,
  } = input;
  const id = generateId();

  const sql = `
    INSERT INTO reply (id, feedback_id, content, author_id, author_name, author_type, is_internal, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
    RETURNING
      id, content, feedback_id as "feedbackId",
      author_id as "authorId", author_name as "authorName",
      author_type as "authorType", is_internal as "isInternal",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Reply>(sql, [
    id,
    feedbackId,
    content,
    authorId,
    authorName,
    authorType,
    isInternal,
  ]);
}

export async function updateReply(id: string, content: string): Promise<Reply> {
  const sql = `
    UPDATE reply
    SET content = $1, updated_at = now()
    WHERE id = $2
    RETURNING
      id, content, feedback_id as "feedbackId",
      author_id as "authorId", author_name as "authorName",
      author_type as "authorType", is_internal as "isInternal",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Reply>(sql, [content, id]);
}

export async function deleteReply(id: string): Promise<void> {
  await query("DELETE FROM reply WHERE id = $1", [id]);
}

export async function getReplyById(id: string): Promise<Reply | null> {
  const sql = `
    SELECT
      id, content, feedback_id as "feedbackId",
      author_id as "authorId", author_name as "authorName",
      author_type as "authorType", is_internal as "isInternal",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reply
    WHERE id = $1
  `;
  return queryOne<Reply>(sql, [id]);
}

export async function getRepliesByFeedbackId(feedbackId: string): Promise<Reply[]> {
  const sql = `
    SELECT
      id, content, feedback_id as "feedbackId",
      author_id as "authorId", author_name as "authorName",
      author_type as "authorType", is_internal as "isInternal",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reply
    WHERE feedback_id = $1
    ORDER BY created_at ASC
  `;
  return query<Reply>(sql, [feedbackId]);
}

// Reply가 특정 프로젝트에 속하는지 확인
export async function getReplyWithProjectId(
  replyId: string
): Promise<{ reply: Reply; projectId: string } | null> {
  const sql = `
    SELECT
      r.id, r.content, r.feedback_id as "feedbackId",
      r.author_id as "authorId", r.author_name as "authorName",
      r.author_type as "authorType", r.is_internal as "isInternal",
      r.created_at as "createdAt", r.updated_at as "updatedAt",
      f.project_id as "projectId"
    FROM reply r
    JOIN feedback f ON r.feedback_id = f.id
    WHERE r.id = $1
  `;

  const result = await queryOne<Reply & { projectId: string }>(sql, [replyId]);
  if (!result) return null;

  const { projectId, ...reply } = result;
  return { reply, projectId };
}

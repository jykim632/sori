import { z } from "zod";

// Author Type enum
export const AuthorTypeSchema = z.enum(["USER", "ADMIN", "API"]);

// Reply 모델 스키마
export const ReplySchema = z.object({
  id: z.string(),
  content: z.string(),
  feedbackId: z.string(),
  authorId: z.string().nullable(),
  authorName: z.string().nullable(),
  authorType: AuthorTypeSchema,
  isInternal: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create 입력 스키마
export const CreateReplySchema = z.object({
  content: z.string().min(1).max(10000),
  feedbackId: z.string(),
  authorName: z.string().max(100).optional(),
  isInternal: z.boolean().default(false),
});

// Update 입력 스키마
export const UpdateReplySchema = z.object({
  content: z.string().min(1).max(10000),
});

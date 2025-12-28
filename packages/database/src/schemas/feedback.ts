import { z } from "zod";
import {
  FeedbackTypeSchema,
  FeedbackStatusSchema,
  PrioritySchema,
} from "./enums.ts";

// Feedback
export const FeedbackSchema = z.object({
  id: z.string(),
  type: FeedbackTypeSchema,
  message: z.string(),
  email: z.string().email(),
  status: FeedbackStatusSchema,
  priority: PrioritySchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  projectId: z.string(),
  privacyAgreedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
});

// Create 입력 스키마 (API 제출용)
export const CreateFeedbackSchema = z.object({
  type: FeedbackTypeSchema,
  message: z.string().min(1).max(5000),
  email: z.string().email(),
  projectId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// 상태 업데이트 스키마
export const UpdateFeedbackStatusSchema = z.object({
  status: FeedbackStatusSchema,
});

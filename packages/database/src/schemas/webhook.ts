import { z } from "zod";
import { WebhookTypeSchema } from "./enums.ts";

// Webhook
export const WebhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: WebhookTypeSchema,
  enabled: z.boolean(),
  organizationId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create 입력 스키마
export const CreateWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  organizationId: z.string(),
});

// Update 입력 스키마
export const UpdateWebhookSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

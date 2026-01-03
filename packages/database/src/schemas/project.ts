import { z } from "zod";
import { JsonValueSchema } from "./json.ts";

// Project
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  allowedOrigins: z.array(z.string()),
  widgetConfig: z.record(z.string(), JsonValueSchema).nullable(),
  organizationId: z.string(),
  apiKey: z.string().nullable(),
  apiKeyCreatedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create/Update 입력 스키마
export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  organizationId: z.string(),
  allowedOrigins: z.array(z.string()).default([]),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  allowedOrigins: z.array(z.string()).optional(),
  widgetConfig: z.record(z.string(), JsonValueSchema).nullable().optional(),
});

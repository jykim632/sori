import { z } from "zod";
import { MemberRoleSchema, PlanSchema, LocaleSchema } from "./enums.ts";

// Organization
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  apiKey: z.string(),
  webhookUrl: z.string().nullable(),
  kakaoChannelId: z.string().nullable(),
  plan: PlanSchema,
  locale: LocaleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// OrganizationMember
export const OrganizationMemberSchema = z.object({
  id: z.string(),
  role: MemberRoleSchema,
  userId: z.string(),
  organizationId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create/Update 입력 스키마
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  kakaoChannelId: z.string().nullable().optional(),
  plan: PlanSchema.optional(),
  locale: LocaleSchema.optional(),
});

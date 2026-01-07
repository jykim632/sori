/**
 * 서버 함수 입력 검증 스키마
 *
 * @sori/database 스키마 재사용 + 서버 함수 전용 스키마
 */
import { z } from "zod";
import { FeedbackTypeSchema, FeedbackStatusSchema } from "@sori/database";

// ============================================
// Webhook
// ============================================

export const GetWebhooksInputSchema = z.object({
  organizationId: z.string(),
});

// CreateWebhookInputSchema - URL 형식 검증은 handler에서 AppError로 처리
export const CreateWebhookInputSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  url: z.string(), // .url() 제외 - handler에서 VAL_INVALID_URL로 검증
});

// UpdateWebhookInputSchema - URL 형식 검증은 handler에서 AppError로 처리
export const UpdateWebhookInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  url: z.string().optional(), // .url() 제외 - handler에서 VAL_INVALID_URL로 검증
  enabled: z.boolean().optional(),
});

export const DeleteWebhookInputSchema = z.object({
  id: z.string(),
});

export const TestWebhookByIdInputSchema = z.object({
  webhookId: z.string(),
});

// ============================================
// Project
// ============================================

export const GetProjectsInputSchema = z.object({
  organizationId: z.string().optional(),
});

export const GetProjectByIdInputSchema = z.object({
  id: z.string(),
});

export const CreateProjectInputSchema = z.object({
  name: z.string(),
  organizationId: z.string(),
  allowedOrigins: z.array(z.string()).optional(),
});

// UpdateProjectInputSchema - widgetConfig 포함
export const UpdateProjectInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  widgetConfig: z
    .object({
      preset: z.enum(["default", "minimal", "rounded"]),
      styles: z.record(z.string(), z.unknown()).optional(),
      position: z
        .enum(["bottom-right", "bottom-left", "top-right", "top-left"])
        .optional(),
      greeting: z.string().optional(),
      types: z.array(FeedbackTypeSchema).optional(),
      locale: z.enum(["ko", "en"]).optional(),
      zIndex: z.number().optional(),
    })
    .optional(),
});

export const DeleteProjectInputSchema = z.object({
  id: z.string(),
});

export const GenerateApiKeyInputSchema = z.object({
  projectId: z.string(),
});

export const RevokeApiKeyInputSchema = z.object({
  projectId: z.string(),
});

// ============================================
// Organization
// ============================================

export const CreateOrganizationInputSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

export const GetOrganizationWithProjectsInputSchema = z.object({
  organizationId: z.string(),
});

export const GetUserRoleInOrganizationInputSchema = z.object({
  organizationId: z.string(),
});

export const UpdateOrganizationWebhookInputSchema = z.object({
  organizationId: z.string(),
  webhookUrl: z.string().nullable(),
});

export const TestWebhookInputSchema = z.object({
  webhookUrl: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
});

// ============================================
// Feedback
// ============================================

export const GetFeedbacksInputSchema = z.object({
  projectId: z.string().optional(),
  organizationId: z.string().optional(),
});

export const GetFeedbacksFilteredInputSchema = z.object({
  organizationId: z.string(),
  projectId: z.string().optional(),
  status: FeedbackStatusSchema.optional(),
  type: FeedbackTypeSchema.optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  orderBy: z.enum(["createdAt", "priority"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const CreateFeedbackInputSchema = z.object({
  message: z.string(),
  type: FeedbackTypeSchema,
  email: z.string(),
  projectId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateFeedbackStatusInputSchema = z.object({
  id: z.string(),
  status: FeedbackStatusSchema,
});

// ============================================
// Reply
// ============================================

export const GetRepliesInputSchema = z.object({
  feedbackId: z.string(),
});

export const CreateReplyInputSchema = z.object({
  feedbackId: z.string(),
  content: z.string(),
  isInternal: z.boolean().optional(),
});

export const UpdateReplyInputSchema = z.object({
  id: z.string(),
  content: z.string(),
});

export const DeleteReplyInputSchema = z.object({
  id: z.string(),
});

// ============================================
// Project Notification
// ============================================

export const GetNotificationSettingInputSchema = z.object({
  projectId: z.string(),
});

export const UpdateNotificationSettingInputSchema = z.object({
  projectId: z.string(),
  emailEnabled: z.boolean(),
  emailRecipients: z
    .array(z.string().email("유효한 이메일 주소를 입력해주세요"))
    .max(10, "이메일 수신자는 최대 10명까지 가능합니다")
    .refine(
      (emails) => new Set(emails).size === emails.length,
      "중복된 이메일 주소가 있습니다"
    ),
  slackEnabled: z.boolean(),
  slackWebhookUrl: z
    .string()
    .url("유효한 URL을 입력해주세요")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.hostname === "hooks.slack.com";
        } catch {
          return false;
        }
      },
      "Slack Webhook URL만 허용됩니다 (https://hooks.slack.com/...)"
    )
    .nullable(),
});

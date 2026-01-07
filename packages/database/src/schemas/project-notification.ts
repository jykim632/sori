import { z } from "zod";

// 프로젝트 알림 설정
export const ProjectNotificationSettingSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  emailEnabled: z.boolean(),
  emailRecipients: z.array(z.string().email()),
  slackEnabled: z.boolean(),
  slackWebhookUrl: z.string().url().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Create/Update 입력 스키마
export const UpdateProjectNotificationSettingSchema = z.object({
  projectId: z.string().min(1),
  emailEnabled: z.boolean(),
  emailRecipients: z
    .array(z.string().email("유효한 이메일 주소를 입력해주세요"))
    .max(10, "이메일 수신자는 최대 10명까지 가능합니다"),
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

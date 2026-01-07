import { z } from "zod";

// 프로젝트 알림 설정 (DB 모델)
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

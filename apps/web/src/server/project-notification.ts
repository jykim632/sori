import { createServerFn } from "@tanstack/react-start";
import {
  getProjectNotificationSetting as getSettingQuery,
  upsertProjectNotificationSetting as upsertSettingQuery,
} from "@sori/database";
import { requireProjectAdmin } from "./auth-helpers";
import { zodValidator } from "@/lib/zod-validator";
import {
  GetNotificationSettingInputSchema,
  UpdateNotificationSettingInputSchema,
} from "@/lib/schemas/server-input";

// ============================================
// 알림 설정 조회
// ============================================

export const getNotificationSetting = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetNotificationSettingInputSchema))
  .handler(async ({ data }) => {
    await requireProjectAdmin(data.projectId);
    return await getSettingQuery(data.projectId);
  });

// ============================================
// 알림 설정 저장 (upsert)
// ============================================

export const updateNotificationSetting = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(UpdateNotificationSettingInputSchema))
  .handler(async ({ data }) => {
    await requireProjectAdmin(data.projectId);
    return await upsertSettingQuery({
      projectId: data.projectId,
      emailEnabled: data.emailEnabled,
      emailRecipients: data.emailRecipients,
      slackEnabled: data.slackEnabled,
      slackWebhookUrl: data.slackWebhookUrl,
    });
  });

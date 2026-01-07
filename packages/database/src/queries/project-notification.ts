import { query, queryOne, queryReturning, generateId } from "../client.ts";
import type { ProjectNotificationSetting } from "../types.ts";

interface UpsertNotificationSettingInput {
  projectId: string;
  emailEnabled: boolean;
  emailRecipients: string[];
  slackEnabled: boolean;
  slackWebhookUrl: string | null;
}

// 프로젝트 알림 설정 조회
export async function getProjectNotificationSetting(
  projectId: string
): Promise<ProjectNotificationSetting | null> {
  const sql = `
    SELECT
      id,
      project_id as "projectId",
      email_enabled as "emailEnabled",
      email_recipients as "emailRecipients",
      slack_enabled as "slackEnabled",
      slack_webhook_url as "slackWebhookUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM project_notification_setting
    WHERE project_id = $1
  `;

  return queryOne<ProjectNotificationSetting>(sql, [projectId]);
}

// 프로젝트 알림 설정 저장 (upsert)
export async function upsertProjectNotificationSetting(
  input: UpsertNotificationSettingInput
): Promise<ProjectNotificationSetting> {
  const { projectId, emailEnabled, emailRecipients, slackEnabled, slackWebhookUrl } = input;
  const id = generateId();

  const sql = `
    INSERT INTO project_notification_setting (
      id, project_id, email_enabled, email_recipients,
      slack_enabled, slack_webhook_url, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now(), now())
    ON CONFLICT (project_id) DO UPDATE SET
      email_enabled = EXCLUDED.email_enabled,
      email_recipients = EXCLUDED.email_recipients,
      slack_enabled = EXCLUDED.slack_enabled,
      slack_webhook_url = EXCLUDED.slack_webhook_url,
      updated_at = now()
    RETURNING
      id,
      project_id as "projectId",
      email_enabled as "emailEnabled",
      email_recipients as "emailRecipients",
      slack_enabled as "slackEnabled",
      slack_webhook_url as "slackWebhookUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return queryReturning<ProjectNotificationSetting>(sql, [
    id,
    projectId,
    emailEnabled,
    emailRecipients,
    slackEnabled,
    slackWebhookUrl,
  ]);
}

// 프로젝트 알림 설정 삭제
export async function deleteProjectNotificationSetting(projectId: string): Promise<void> {
  await query("DELETE FROM project_notification_setting WHERE project_id = $1", [projectId]);
}

// 알림이 활성화된 설정 조회 (피드백 API에서 사용)
export async function getActiveNotificationSetting(
  projectId: string
): Promise<ProjectNotificationSetting | null> {
  const sql = `
    SELECT
      id,
      project_id as "projectId",
      email_enabled as "emailEnabled",
      email_recipients as "emailRecipients",
      slack_enabled as "slackEnabled",
      slack_webhook_url as "slackWebhookUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM project_notification_setting
    WHERE project_id = $1
      AND (email_enabled = true OR slack_enabled = true)
  `;

  return queryOne<ProjectNotificationSetting>(sql, [projectId]);
}

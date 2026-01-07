import type { ProjectNotificationSetting } from "@sori/database";
import type { NotificationContext, NotificationSender } from "./types";
import { createEmailSender } from "./email";
import { createSlackSender } from "./slack";

export async function sendProjectNotifications(
  setting: ProjectNotificationSetting,
  context: NotificationContext
): Promise<void> {
  const senders: NotificationSender[] = [];

  if (setting.emailEnabled && setting.emailRecipients.length > 0) {
    senders.push(createEmailSender(setting.emailRecipients));
  }

  if (setting.slackEnabled && setting.slackWebhookUrl) {
    senders.push(createSlackSender(setting.slackWebhookUrl));
  }

  if (senders.length === 0) {
    return;
  }

  const results = await Promise.allSettled(senders.map((s) => s.send(context)));

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[notification] ${senders[i].channel} failed:`,
        result.reason instanceof Error ? result.reason.message : result.reason
      );
    }
  });
}

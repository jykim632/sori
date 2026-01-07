import type { ProjectNotificationSetting } from "@sori/database";
import type { NotificationContext, NotificationSender } from "./types";
import { createEmailSender } from "./email";
import { createSlackSender } from "./slack";

function collectSenders(setting: ProjectNotificationSetting): NotificationSender[] {
  const senders: NotificationSender[] = [];

  if (setting.emailEnabled && setting.emailRecipients.length > 0) {
    senders.push(createEmailSender(setting.emailRecipients));
  }

  if (setting.slackEnabled && setting.slackWebhookUrl) {
    senders.push(createSlackSender(setting.slackWebhookUrl));
  }

  return senders;
}

function logFailures(
  results: PromiseSettledResult<void>[],
  senders: NotificationSender[]
): void {
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[notification] ${senders[i].channel} failed:`,
        result.reason instanceof Error ? result.reason.message : result.reason
      );
    }
  });
}

export async function sendProjectNotifications(
  setting: ProjectNotificationSetting,
  context: NotificationContext
): Promise<void> {
  const senders = collectSenders(setting);

  if (senders.length === 0) {
    return;
  }

  const results = await Promise.allSettled(senders.map((s) => s.send(context)));
  logFailures(results, senders);
}

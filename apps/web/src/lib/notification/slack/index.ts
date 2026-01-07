import type { NotificationSender, NotificationContext } from "../types";
import { TYPE_INFO_MAP } from "../types";

export function createSlackSender(webhookUrl: string): NotificationSender {
  return {
    channel: "slack",
    async send(context: NotificationContext): Promise<void> {
      const { feedback, project, dashboardUrl } = context;
      const typeInfo = TYPE_INFO_MAP[feedback.type];

      const message = [
        `🔔 새 피드백 [${project.name}]`,
        `유형: ${typeInfo.emoji} ${typeInfo.label}`,
        `내용: ${feedback.message}`,
        feedback.email ? `고객: ${feedback.email}` : null,
        dashboardUrl,
      ]
        .filter(Boolean)
        .join("\n");

      console.log("[slack] sending to webhook, project:", project.name);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText} - ${text}`);
      }
      console.log("[slack] sent successfully");
    },
  };
}

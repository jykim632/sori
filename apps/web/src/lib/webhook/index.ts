export * from "./types";
export * from "./utils";
export { getFormatter } from "./formatters";
export { sendTestWebhook } from "./test-webhook";

import type { FeedbackData, ProjectData, OrganizationData } from "./types";
import { getFormatter } from "./formatters";

export function formatWebhookPayload(
  webhookUrl: string,
  feedback: FeedbackData,
  project: ProjectData,
  organization: OrganizationData,
  isTest = false
): unknown {
  const formatter = getFormatter(webhookUrl);
  return formatter.format({ feedback, project, organization, isTest });
}

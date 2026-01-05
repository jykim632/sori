import type { WebhookFormatter, WebhookContext } from "../types";
import { getTypeInfo, getEventLabel } from "../utils";

export const slackFormatter: WebhookFormatter = {
  format(context: WebhookContext) {
    const { feedback, project, isTest } = context;
    const typeInfo = getTypeInfo(feedback.type);
    const eventLabel = getEventLabel(isTest);

    return {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: eventLabel, emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*유형:*\n${typeInfo.emoji} ${typeInfo.label}` },
            { type: "mrkdwn", text: `*프로젝트:*\n${project.name}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*메시지:*\n${feedback.message}` },
        },
        ...(feedback.email
          ? [{ type: "section", fields: [{ type: "mrkdwn", text: `*이메일:*\n${feedback.email}` }] }]
          : []),
        ...(feedback.metadata?.url
          ? [{ type: "context", elements: [{ type: "mrkdwn", text: `📍 ${feedback.metadata.url}` }] }]
          : []),
      ],
    };
  },
};

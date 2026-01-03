import type { WebhookFormatter, WebhookContext } from "../types";
import { getTypeInfo, getEventLabel } from "../utils";

export const telegramFormatter: WebhookFormatter = {
  format(context: WebhookContext) {
    const { feedback, project, isTest } = context;
    const typeInfo = getTypeInfo(feedback.type);
    const eventLabel = getEventLabel(isTest);

    const lines = [
      `<b>${eventLabel}</b>`,
      ``,
      `${typeInfo.emoji} <b>유형:</b> ${typeInfo.label}`,
      `📁 <b>프로젝트:</b> ${project.name}`,
      ``,
      `💬 <b>메시지:</b>`,
      feedback.message,
    ];

    if (feedback.email) {
      lines.push(``, `📧 <b>이메일:</b> ${feedback.email}`);
    }

    if (feedback.metadata?.url) {
      lines.push(``, `🔗 ${feedback.metadata.url}`);
    }

    return {
      text: lines.join("\n"),
      parse_mode: "HTML",
    };
  },
};

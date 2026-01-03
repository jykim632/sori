import type { WebhookFormatter, WebhookContext } from "../types";
import { getTypeInfo, getEventLabel } from "../utils";

const TYPE_COLORS: Record<string, number> = {
  BUG: 0xef4444,
  FEATURE: 0x8b5cf6,
  INQUIRY: 0x3b82f6,
};

export const discordFormatter: WebhookFormatter = {
  format(context: WebhookContext) {
    const { feedback, project, isTest } = context;
    const typeInfo = getTypeInfo(feedback.type);
    const eventLabel = getEventLabel(isTest);

    return {
      embeds: [
        {
          title: eventLabel,
          color: TYPE_COLORS[feedback.type] ?? 0x3b82f6,
          fields: [
            { name: "유형", value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
            { name: "프로젝트", value: project.name, inline: true },
            { name: "메시지", value: feedback.message },
            ...(feedback.email ? [{ name: "이메일", value: feedback.email, inline: true }] : []),
            ...(feedback.metadata?.url ? [{ name: "URL", value: feedback.metadata.url }] : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };
  },
};

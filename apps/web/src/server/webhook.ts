import { createServerFn } from "@tanstack/react-start";
import {
  getWebhooks as getWebhooksQuery,
  createWebhook as createWebhookQuery,
  updateWebhook as updateWebhookQuery,
  deleteWebhook as deleteWebhookQuery,
  getWebhookWithOrganization,
  getWebhookCount,
  type Plan,
} from "@sori/database";
import { getOrganizationWithProjects } from "./organization";

// Plan limits for webhooks
const WEBHOOK_LIMITS: Record<Plan, number> = {
  FREE: 1,
  PRO: 5,
  TEAM: 10,
  ENTERPRISE: 50,
};

// Get all webhooks for an organization
export const getWebhooks = createServerFn({ method: "GET" })
  .inputValidator((d: { organizationId: string }) => d)
  .handler(async ({ data }) => {
    return await getWebhooksQuery(data.organizationId);
  });

// Create a new webhook
export const createWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { organizationId: string; name: string; url: string }) => d)
  .handler(async ({ data }) => {
    const { organizationId, name, url } = data;

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error("유효한 URL을 입력해주세요");
    }

    // Check plan limits
    const org = await getOrganizationWithProjects({ data: { organizationId } });

    if (!org) {
      throw new Error("조직을 찾을 수 없습니다");
    }

    const webhookCount = await getWebhookCount(organizationId);
    const limit = WEBHOOK_LIMITS[org.plan as Plan] || 1;

    if (webhookCount >= limit) {
      throw new Error(`${org.plan} 플랜은 최대 ${limit}개의 웹훅만 등록할 수 있습니다`);
    }

    return await createWebhookQuery({ name, url, organizationId });
  });

// Update a webhook
export const updateWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name?: string; url?: string; enabled?: boolean }) => d)
  .handler(async ({ data }) => {
    const { id, name, url, enabled } = data;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        throw new Error("유효한 URL을 입력해주세요");
      }
    }

    return await updateWebhookQuery({ id, name, url, enabled });
  });

// Delete a webhook
export const deleteWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await deleteWebhookQuery(data.id);
    return { success: true };
  });

// Test a webhook (same format logic as organization.ts)
function getTypeInfo(type: string) {
  switch (type) {
    case "BUG": return { emoji: "🐛", label: "버그 리포트" };
    case "FEATURE": return { emoji: "💡", label: "기능 요청" };
    case "INQUIRY": return { emoji: "❓", label: "문의" };
    default: return { emoji: "📝", label: type };
  }
}

function formatWebhookPayload(
  webhookUrl: string,
  feedback: { id: string; type: string; message: string; email: string | null; metadata: { url?: string } | null },
  project: { id: string; name: string },
  organization: { id: string; name: string },
  isTest = false
) {
  const typeInfo = getTypeInfo(feedback.type);
  const eventLabel = isTest ? "🔔 웹훅 테스트" : "🔔 새 피드백";

  if (webhookUrl.includes("hooks.slack.com")) {
    return {
      blocks: [
        { type: "header", text: { type: "plain_text", text: eventLabel, emoji: true } },
        { type: "section", fields: [
          { type: "mrkdwn", text: `*유형:*\n${typeInfo.emoji} ${typeInfo.label}` },
          { type: "mrkdwn", text: `*프로젝트:*\n${project.name}` },
        ]},
        { type: "section", text: { type: "mrkdwn", text: `*메시지:*\n${feedback.message}` } },
        ...(feedback.email ? [{ type: "section", fields: [{ type: "mrkdwn", text: `*이메일:*\n${feedback.email}` }] }] : []),
        ...(feedback.metadata?.url ? [{ type: "context", elements: [{ type: "mrkdwn", text: `📍 ${feedback.metadata.url}` }] }] : []),
      ],
    };
  }

  if (webhookUrl.includes("discord.com/api/webhooks")) {
    return {
      embeds: [{
        title: eventLabel,
        color: feedback.type === "BUG" ? 0xef4444 : feedback.type === "FEATURE" ? 0x8b5cf6 : 0x3b82f6,
        fields: [
          { name: "유형", value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
          { name: "프로젝트", value: project.name, inline: true },
          { name: "메시지", value: feedback.message },
          ...(feedback.email ? [{ name: "이메일", value: feedback.email, inline: true }] : []),
          ...(feedback.metadata?.url ? [{ name: "URL", value: feedback.metadata.url }] : []),
        ],
        timestamp: new Date().toISOString(),
      }],
    };
  }

  if (webhookUrl.includes("api.telegram.org")) {
    const lines = [
      `<b>${eventLabel}</b>`, ``,
      `${typeInfo.emoji} <b>유형:</b> ${typeInfo.label}`,
      `📁 <b>프로젝트:</b> ${project.name}`, ``,
      `💬 <b>메시지:</b>`, feedback.message,
    ];
    if (feedback.email) lines.push(``, `📧 <b>이메일:</b> ${feedback.email}`);
    if (feedback.metadata?.url) lines.push(``, `🔗 ${feedback.metadata.url}`);
    return { text: lines.join("\n"), parse_mode: "HTML" };
  }

  return {
    event: isTest ? "webhook.test" : "feedback.created",
    timestamp: new Date().toISOString(),
    feedback, project, organization,
  };
}

export const testWebhookById = createServerFn({ method: "POST" })
  .inputValidator((d: { webhookId: string }) => d)
  .handler(async ({ data }) => {
    const webhook = await getWebhookWithOrganization(data.webhookId);

    if (!webhook) {
      return { success: false, message: "웹훅을 찾을 수 없습니다" };
    }

    const testFeedback = {
      id: "test_" + Date.now(),
      type: "BUG",
      message: "이것은 테스트 피드백입니다.",
      email: "test@example.com",
      metadata: { url: "https://example.com" },
    };

    const payload = formatWebhookPayload(
      webhook.url,
      testFeedback,
      { id: webhook.organization.projects[0]?.id || "test", name: webhook.organization.projects[0]?.name || "Test Project" },
      { id: webhook.organization.id, name: webhook.organization.name },
      true
    );

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Sori-Webhook/1.0" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true, message: `성공! (${response.status})` };
      } else {
        const text = await response.text().catch(() => "");
        return { success: false, message: `실패: ${response.status}${text ? ` - ${text.slice(0, 100)}` : ""}` };
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "연결 실패" };
    }
  });

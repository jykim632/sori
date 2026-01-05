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
import { formatWebhookPayload } from "@/lib/webhook";
import { AppError } from "@/lib/errors";

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
      throw new AppError("VAL_INVALID_URL");
    }

    // Check plan limits
    const org = await getOrganizationWithProjects({ data: { organizationId } });

    if (!org) {
      throw new AppError("RES_ORG_NOT_FOUND");
    }

    const webhookCount = await getWebhookCount(organizationId);
    const limit = WEBHOOK_LIMITS[org.plan as Plan] || 1;

    if (webhookCount >= limit) {
      throw new AppError("LIMIT_WEBHOOK_EXCEEDED", {
        plan: org.plan,
        limit: String(limit),
      });
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
        throw new AppError("VAL_INVALID_URL");
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

export const testWebhookById = createServerFn({ method: "POST" })
  .inputValidator((d: { webhookId: string }) => d)
  .handler(async ({ data }) => {
    const webhook = await getWebhookWithOrganization(data.webhookId);

    if (!webhook) {
      return { success: false, message: "웹훅을 찾을 수 없습니다" };
    }

    const testFeedback = {
      id: "test_" + Date.now(),
      type: "BUG" as const,
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

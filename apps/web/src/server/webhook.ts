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
import { sendTestWebhook } from "@/lib/webhook";
import { AppError } from "@/lib/errors";
import { zodValidator } from "@/lib/zod-validator";
import { requireOrgMembership } from "./auth-helpers";
import {
  GetWebhooksInputSchema,
  CreateWebhookInputSchema,
  UpdateWebhookInputSchema,
  DeleteWebhookInputSchema,
  TestWebhookByIdInputSchema,
} from "@/lib/schemas/server-input";

// Plan limits for webhooks
const WEBHOOK_LIMITS: Record<Plan, number> = {
  FREE: 1,
  PRO: 5,
  TEAM: 10,
  ENTERPRISE: 50,
};

// Get all webhooks for an organization
export const getWebhooks = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetWebhooksInputSchema))
  .handler(async ({ data }) => {
    await requireOrgMembership(data.organizationId);
    return await getWebhooksQuery(data.organizationId);
  });

// Create a new webhook
export const createWebhook = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(CreateWebhookInputSchema))
  .handler(async ({ data }) => {
    const { organizationId, name, url } = data;

    // 권한 검증
    await requireOrgMembership(organizationId);

    // URL 형식 검증 (명확한 에러 메시지 VAL_INVALID_URL)
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
  .inputValidator(zodValidator(UpdateWebhookInputSchema))
  .handler(async ({ data }) => {
    const { id, name, url, enabled } = data;

    // 권한 검증: webhook의 조직 멤버인지 확인
    const webhook = await getWebhookWithOrganization(id);
    if (!webhook) {
      throw new AppError("RES_WEBHOOK_NOT_FOUND");
    }
    await requireOrgMembership(webhook.organization.id);

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
  .inputValidator(zodValidator(DeleteWebhookInputSchema))
  .handler(async ({ data }) => {
    // 권한 검증: webhook의 조직 멤버인지 확인
    const webhook = await getWebhookWithOrganization(data.id);
    if (!webhook) {
      throw new AppError("RES_WEBHOOK_NOT_FOUND");
    }
    await requireOrgMembership(webhook.organization.id);

    await deleteWebhookQuery(data.id);
    return { success: true };
  });

export const testWebhookById = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(TestWebhookByIdInputSchema))
  .handler(async ({ data }) => {
    const webhook = await getWebhookWithOrganization(data.webhookId);

    if (!webhook) {
      return { success: false, message: "웹훅을 찾을 수 없습니다" };
    }

    // 권한 검증
    await requireOrgMembership(webhook.organization.id);

    return await sendTestWebhook({
      webhookUrl: webhook.url,
      project: {
        id: webhook.organization.projects[0]?.id || "test",
        name: webhook.organization.projects[0]?.name || "Test Project",
      },
      organization: { id: webhook.organization.id, name: webhook.organization.name },
    });
  });

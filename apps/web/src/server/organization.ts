import { createServerFn } from "@tanstack/react-start";
import {
  createOrganization as createOrganizationQuery,
  getUserOrganizations as getUserOrganizationsQuery,
  getUserOrganization as getUserOrganizationQuery,
  getOrganizationWithProjects as getOrganizationWithProjectsQuery,
  getUserRoleInOrganization as getUserRoleInOrganizationQuery,
  updateOrganizationWebhook as updateOrganizationWebhookQuery,
  getOrganizationBySlug,
} from "@sori/database";
import { getSessionUserId, requireOrgMembership, requireOrgAdmin } from "./auth-helpers";
import { sendTestWebhook } from "@/lib/webhook";
import { AppError } from "@/lib/errors";
import { validateUrl } from "@/lib/validators/url";
import { zodValidator } from "@/lib/zod-validator";
import {
  CreateOrganizationInputSchema,
  GetOrganizationWithProjectsInputSchema,
  GetUserRoleInOrganizationInputSchema,
  UpdateOrganizationWebhookInputSchema,
  TestWebhookInputSchema,
} from "@/lib/schemas/server-input";

// ============================================
// 조직 생성 (인증 필요)
// ============================================
export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(CreateOrganizationInputSchema))
  .handler(async ({ data }) => {
    // 세션에서 userId 추출 (클라이언트에서 받지 않음)
    const userId = await getSessionUserId();
    const { name, slug } = data;

    // Check if slug is already taken
    const existing = await getOrganizationBySlug(slug);

    if (existing) {
      throw new AppError("VAL_DUPLICATE_SLUG");
    }

    // Create organization with the user as OWNER
    return await createOrganizationQuery({ name, slug, userId });
  });

// ============================================
// 조직 조회 (인증 필요)
// ============================================

// Get all organizations the user belongs to
export const getUserOrganizations = createServerFn({ method: "GET" })
  .handler(async () => {
    // 세션에서 userId 추출
    const userId = await getSessionUserId();
    const memberships = await getUserOrganizationsQuery(userId);

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  });

// Get first organization (for backward compatibility)
export const getUserOrganization = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getSessionUserId();
    return await getUserOrganizationQuery(userId);
  });

// Get organization with projects (멤버십 확인)
export const getOrganizationWithProjects = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetOrganizationWithProjectsInputSchema))
  .handler(async ({ data }) => {
    // 해당 조직의 멤버인지 확인
    await requireOrgMembership(data.organizationId);
    return await getOrganizationWithProjectsQuery(data.organizationId);
  });

// Get user's role in a specific organization
export const getUserRoleInOrganization = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetUserRoleInOrganizationInputSchema))
  .handler(async ({ data }) => {
    const userId = await getSessionUserId();
    return await getUserRoleInOrganizationQuery(userId, data.organizationId);
  });

// ============================================
// 조직 수정 (관리자 권한 필요)
// ============================================

// Update organization webhook URL
export const updateOrganizationWebhook = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(UpdateOrganizationWebhookInputSchema))
  .handler(async ({ data }) => {
    const { organizationId, webhookUrl } = data;

    // 관리자 권한 확인
    await requireOrgAdmin(organizationId);

    if (webhookUrl) {
      validateUrl(webhookUrl);
    }

    return await updateOrganizationWebhookQuery(organizationId, webhookUrl);
  });

// Test webhook (server-side to avoid CORS)
export const testWebhook = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(TestWebhookInputSchema))
  .handler(async ({ data }) => {
    // 해당 조직의 멤버인지 확인
    await requireOrgMembership(data.organizationId);

    const { webhookUrl, organizationId, organizationName, projectId, projectName } = data;

    return await sendTestWebhook({
      webhookUrl,
      project: { id: projectId || "test_project", name: projectName || "Test Project" },
      organization: { id: organizationId, name: organizationName },
    });
  });

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
import { formatWebhookPayload } from "@/lib/webhook";

// ============================================
// 조직 생성 (인증 필요)
// ============================================
export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; slug: string }) => d)
  .handler(async ({ data }) => {
    // 세션에서 userId 추출 (클라이언트에서 받지 않음)
    const userId = await getSessionUserId();
    const { name, slug } = data;

    // Check if slug is already taken
    const existing = await getOrganizationBySlug(slug);

    if (existing) {
      throw new Error("이미 사용 중인 URL입니다");
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
  .inputValidator((d: { organizationId: string }) => d)
  .handler(async ({ data }) => {
    // 해당 조직의 멤버인지 확인
    await requireOrgMembership(data.organizationId);
    return await getOrganizationWithProjectsQuery(data.organizationId);
  });

// Get user's role in a specific organization
export const getUserRoleInOrganization = createServerFn({ method: "GET" })
  .inputValidator((d: { organizationId: string }) => d)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId();
    return await getUserRoleInOrganizationQuery(userId, data.organizationId);
  });

// ============================================
// 조직 수정 (관리자 권한 필요)
// ============================================

// Update organization webhook URL
export const updateOrganizationWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { organizationId: string; webhookUrl: string | null }) => d)
  .handler(async ({ data }) => {
    const { organizationId, webhookUrl } = data;

    // 관리자 권한 확인
    await requireOrgAdmin(organizationId);

    // Validate URL if provided
    if (webhookUrl) {
      try {
        new URL(webhookUrl);
      } catch {
        throw new Error("유효한 URL을 입력해주세요");
      }
    }

    return await updateOrganizationWebhookQuery(organizationId, webhookUrl);
  });

// Test webhook (server-side to avoid CORS)
export const testWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      webhookUrl: string;
      organizationId: string;
      organizationName: string;
      projectId?: string;
      projectName?: string;
    }) => d
  )
  .handler(async ({ data }) => {
    // 해당 조직의 멤버인지 확인
    await requireOrgMembership(data.organizationId);

    const { webhookUrl, organizationId, organizationName, projectId, projectName } = data;

    const testFeedback = {
      id: "test_" + Date.now(),
      type: "BUG",
      message: "이것은 테스트 피드백입니다.",
      email: "test@example.com",
      metadata: { url: "https://example.com" },
    };

    const testPayload = formatWebhookPayload(
      webhookUrl,
      testFeedback,
      { id: projectId || "test_project", name: projectName || "Test Project" },
      { id: organizationId, name: organizationName },
      true
    );

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Sori-Webhook/1.0",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        return { success: true, message: `성공! (${response.status})` };
      } else {
        const text = await response.text().catch(() => "");
        return {
          success: false,
          message: `실패: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 100)}` : ""}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "연결 실패",
      };
    }
  });

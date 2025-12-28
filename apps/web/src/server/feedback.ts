import { createServerFn } from "@tanstack/react-start";
import {
  getFeedbacks as getFeedbacksQuery,
  getFeedbacksFiltered as getFeedbacksFilteredQuery,
  createFeedback as createFeedbackQuery,
  updateFeedbackStatus as updateFeedbackStatusQuery,
  getFeedbackById,
  type FeedbackType,
  type FeedbackStatus,
} from "@sori/database";
import { requireOrgMembership, requireProjectAccess } from "./auth-helpers";

// ============================================
// 피드백 조회 (멤버십 필요)
// ============================================

export const getFeedbacks = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId?: string; organizationId?: string }) => d)
  .handler(async ({ data }) => {
    // organizationId가 있으면 조직 멤버십 확인
    if (data?.organizationId) {
      await requireOrgMembership(data.organizationId);
    }
    // projectId가 있으면 프로젝트 접근 권한 확인
    if (data?.projectId) {
      await requireProjectAccess(data.projectId);
    }
    return await getFeedbacksQuery({
      projectId: data?.projectId,
      organizationId: data?.organizationId,
    });
  });

type OrderBy = "createdAt" | "priority";
type Order = "asc" | "desc";

export const getFeedbacksFiltered = createServerFn({ method: "GET" })
  .inputValidator(
    (d: {
      organizationId: string;
      projectId?: string;
      status?: FeedbackStatus;
      type?: FeedbackType;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      orderBy?: OrderBy;
      order?: Order;
      page?: number;
      limit?: number;
    }) => d
  )
  .handler(async ({ data }) => {
    // 조직 멤버십 확인
    await requireOrgMembership(data.organizationId);

    return await getFeedbacksFilteredQuery({
      organizationId: data.organizationId,
      projectId: data.projectId,
      status: data.status,
      type: data.type,
      search: data.search,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      orderBy: data.orderBy,
      order: data.order,
      page: data.page,
      limit: data.limit,
    });
  });

// ============================================
// 피드백 생성 (어드민용 - 멤버십 필요)
// ============================================

export const createFeedback = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      message: string;
      type: FeedbackType;
      email: string;
      projectId: string;
      metadata?: Record<string, unknown>;
    }) => d
  )
  .handler(async ({ data }) => {
    const { message, type, email, projectId, metadata } = data;

    // 프로젝트 접근 권한 확인
    await requireProjectAccess(projectId);

    if (!message || !type || !projectId || !email) {
      throw new Error("Missing required fields");
    }

    return await createFeedbackQuery({
      message,
      type,
      email,
      projectId,
      metadata: metadata || null,
      privacyAgreedAt: new Date(),
    });
  });

// ============================================
// 피드백 상태 변경 (멤버십 필요)
// ============================================

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: FeedbackStatus }) => d)
  .handler(async ({ data }) => {
    // 피드백 조회 후 프로젝트 접근 권한 확인
    const feedback = await getFeedbackById(data.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    await requireProjectAccess(feedback.projectId);

    return await updateFeedbackStatusQuery({
      id: data.id,
      status: data.status,
    });
  });

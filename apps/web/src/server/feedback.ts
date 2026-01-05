import { createServerFn } from "@tanstack/react-start";
import {
  getFeedbacks as getFeedbacksQuery,
  getFeedbacksFiltered as getFeedbacksFilteredQuery,
  createFeedback as createFeedbackQuery,
  updateFeedbackStatus as updateFeedbackStatusQuery,
  getFeedbackById,
} from "@sori/database";
import { requireOrgMembership, requireProjectAccess } from "./auth-helpers";
import { AppError } from "@/lib/errors";
import { zodValidator } from "@/lib/zod-validator";
import {
  GetFeedbacksInputSchema,
  GetFeedbacksFilteredInputSchema,
  CreateFeedbackInputSchema,
  UpdateFeedbackStatusInputSchema,
} from "@/lib/schemas/server-input";

// ============================================
// 피드백 조회 (멤버십 필요)
// ============================================

export const getFeedbacks = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetFeedbacksInputSchema))
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

export const getFeedbacksFiltered = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetFeedbacksFilteredInputSchema))
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
  .inputValidator(zodValidator(CreateFeedbackInputSchema))
  .handler(async ({ data }) => {
    const { message, type, email, projectId, metadata } = data;

    // 프로젝트 접근 권한 확인
    await requireProjectAccess(projectId);

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
  .inputValidator(zodValidator(UpdateFeedbackStatusInputSchema))
  .handler(async ({ data }) => {
    // 피드백 조회 후 프로젝트 접근 권한 확인
    const feedback = await getFeedbackById(data.id);
    if (!feedback) {
      throw new AppError("RES_FEEDBACK_NOT_FOUND");
    }
    await requireProjectAccess(feedback.projectId);

    return await updateFeedbackStatusQuery({
      id: data.id,
      status: data.status,
    });
  });

import { createServerFn } from "@tanstack/react-start";
import {
  getFeedbacks as getFeedbacksQuery,
  getFeedbacksFiltered as getFeedbacksFilteredQuery,
  createFeedback as createFeedbackQuery,
  updateFeedbackStatus as updateFeedbackStatusQuery,
  type FeedbackType,
  type FeedbackStatus,
} from "@sori/database";

export const getFeedbacks = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId?: string; organizationId?: string }) => d)
  .handler(async ({ data }) => {
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

export const createFeedback = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      message: string;
      type: FeedbackType;
      email?: string;
      projectId: string;
      metadata?: Record<string, unknown>;
    }) => d
  )
  .handler(async ({ data }) => {
    const { message, type, email, projectId, metadata } = data;

    if (!message || !type || !projectId) {
      throw new Error("Missing required fields");
    }

    return await createFeedbackQuery({
      message,
      type,
      email: email || null,
      projectId,
      metadata: metadata || null,
    });
  });

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: FeedbackStatus }) => d)
  .handler(async ({ data }) => {
    return await updateFeedbackStatusQuery({
      id: data.id,
      status: data.status,
    });
  });

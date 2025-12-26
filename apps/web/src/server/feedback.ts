import { createServerFn } from "@tanstack/react-start";
import {
  getFeedbacks as getFeedbacksQuery,
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

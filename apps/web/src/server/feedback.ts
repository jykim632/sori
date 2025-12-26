import { createServerFn } from "@tanstack/react-start";
import { prisma, type FeedbackType, type FeedbackStatus, type Prisma } from "@sori/database";

export const getFeedbacks = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId?: string; organizationId?: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.feedback.findMany({
      where: {
        ...(data?.projectId && { projectId: data.projectId }),
        ...(data?.organizationId && { project: { organizationId: data.organizationId } }),
      },
      orderBy: { createdAt: "desc" },
      include: { project: true },
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

    return await prisma.feedback.create({
      data: {
        message,
        type,
        email: email || null,
        projectId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  });

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: FeedbackStatus }) => d)
  .handler(async ({ data }) => {
    const updateData: { status: FeedbackStatus; resolvedAt?: Date | null } = {
      status: data.status,
    };

    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedAt = null;
    }

    return await prisma.feedback.update({
      where: { id: data.id },
      data: updateData,
    });
  });

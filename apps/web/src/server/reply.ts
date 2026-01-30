import { createServerFn } from "@tanstack/react-start";
import { getCachedSession } from "@/lib/session-cache";
import { getSessionUserId } from "./auth-helpers";
import { AppError } from "@/lib/errors";
import {
  createReply as createReplyQuery,
  updateReply as updateReplyQuery,
  deleteReply as deleteReplyQuery,
  getRepliesByFeedbackId,
  getFeedbackWithProjectById,
} from "@sori/database";
import { zodValidator } from "@/lib/zod-validator";
import {
  GetRepliesInputSchema,
  CreateReplyInputSchema,
  UpdateReplyInputSchema,
  DeleteReplyInputSchema,
} from "@/lib/schemas/server-input";
import { sendCustomerReplyNotification } from "@/lib/notification/email/customer";

export const getReplies = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetRepliesInputSchema))
  .handler(async ({ data }) => {
    return await getRepliesByFeedbackId(data.feedbackId);
  });

export const createReply = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(CreateReplyInputSchema))
  .handler(async ({ data }) => {
    const session = await getCachedSession();
    if (!session) {
      throw new AppError("AUTH_UNAUTHORIZED");
    }

    const reply = await createReplyQuery({
      feedbackId: data.feedbackId,
      content: data.content,
      authorId: session.user.id,
      authorName: session.user.name || session.user.email,
      authorType: "ADMIN",
      isInternal: data.isInternal || false,
    });

    // Send email notification to customer if requested
    if (data.sendEmail && !data.isInternal) {
      const feedback = await getFeedbackWithProjectById(data.feedbackId);
      if (feedback?.email && feedback.token) {
        const appUrl = process.env.APP_URL || "https://web.sori.life";
        const ticketUrl = `${appUrl}/f/${feedback.token}`;

        // Fire and forget - don't block on email
        sendCustomerReplyNotification(feedback.email, {
          feedback: {
            type: feedback.type,
            message: feedback.message,
          },
          reply: {
            content: data.content,
            authorName: session.user.name || "담당자",
          },
          project: {
            name: feedback.project.name,
          },
          ticketUrl,
        }).catch((err) => {
          console.error("Failed to send customer reply notification:", err);
        });
      }
    }

    return reply;
  });

export const updateReply = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(UpdateReplyInputSchema))
  .handler(async ({ data }) => {
    await getSessionUserId();
    return await updateReplyQuery(data.id, data.content);
  });

export const deleteReply = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(DeleteReplyInputSchema))
  .handler(async ({ data }) => {
    await getSessionUserId();
    await deleteReplyQuery(data.id);
    return { success: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import {
  createReply as createReplyQuery,
  updateReply as updateReplyQuery,
  deleteReply as deleteReplyQuery,
  getRepliesByFeedbackId,
} from "@sori/database";

// 인증 확인 헬퍼
async function requireAuth() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export const getReplies = createServerFn({ method: "GET" })
  .inputValidator((d: { feedbackId: string }) => d)
  .handler(async ({ data }) => {
    return await getRepliesByFeedbackId(data.feedbackId);
  });

export const createReply = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      feedbackId: string;
      content: string;
      isInternal?: boolean;
    }) => d
  )
  .handler(async ({ data }) => {
    const session = await requireAuth();

    return await createReplyQuery({
      feedbackId: data.feedbackId,
      content: data.content,
      authorId: session.user.id,
      authorName: session.user.name || session.user.email,
      authorType: "ADMIN",
      isInternal: data.isInternal || false,
    });
  });

export const updateReply = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; content: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    return await updateReplyQuery(data.id, data.content);
  });

export const deleteReply = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth();
    await deleteReplyQuery(data.id);
    return { success: true };
  });

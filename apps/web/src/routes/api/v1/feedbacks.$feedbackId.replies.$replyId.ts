import { createFileRoute } from "@tanstack/react-router";
import { getReplyWithProjectId, updateReply, deleteReply } from "@sori/database";
import { authenticateApiKey, apiError, apiSuccess, apiOptions } from "@/lib/api-auth";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { z } from "zod";

const UpdateReplySchema = z.object({
  content: z.string().min(1).max(10000),
});

export const Route = createFileRoute(
  "/api/v1/feedbacks/$feedbackId/replies/$replyId"
)({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        // 1. 인증
        const auth = await authenticateApiKey(request);
        if (!auth.success) {
          return apiError(auth.error, auth.status);
        }

        // 2. Rate limiting
        const rateLimit = checkApiRateLimit(auth.project.apiKey!);
        if (!rateLimit.allowed) {
          return apiError("Rate limit exceeded", 429, {
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          });
        }

        try {
          // 3. Reply 조회 및 소유권 확인
          const result = await getReplyWithProjectId(params.replyId);

          if (!result || result.projectId !== auth.project.id) {
            return apiError("Reply not found", 404);
          }

          // 4. feedbackId 일치 확인
          if (result.reply.feedbackId !== params.feedbackId) {
            return apiError("Reply not found", 404);
          }

          // 5. API로 생성된 Reply만 수정 가능
          if (result.reply.authorType !== "API") {
            return apiError("Cannot modify replies created by admin", 403);
          }

          // 6. 요청 바디 파싱
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return apiError("Invalid JSON body", 400);
          }

          // 7. 유효성 검사
          const parsed = UpdateReplySchema.safeParse(body);
          if (!parsed.success) {
            return apiError("Validation error", 400, {
              details: parsed.error.flatten(),
            });
          }

          // 8. 업데이트
          const updated = await updateReply(params.replyId, parsed.data.content);

          const response = apiSuccess(updated);
          response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
          response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
          return response;
        } catch (error) {
          console.error("Reply update error:", error);
          return apiError("Internal server error", 500);
        }
      },

      DELETE: async ({ request, params }) => {
        // 1. 인증
        const auth = await authenticateApiKey(request);
        if (!auth.success) {
          return apiError(auth.error, auth.status);
        }

        // 2. Rate limiting
        const rateLimit = checkApiRateLimit(auth.project.apiKey!);
        if (!rateLimit.allowed) {
          return apiError("Rate limit exceeded", 429, {
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          });
        }

        try {
          // 3. Reply 조회 및 소유권 확인
          const result = await getReplyWithProjectId(params.replyId);

          if (!result || result.projectId !== auth.project.id) {
            return apiError("Reply not found", 404);
          }

          // 4. feedbackId 일치 확인
          if (result.reply.feedbackId !== params.feedbackId) {
            return apiError("Reply not found", 404);
          }

          // 5. API로 생성된 Reply만 삭제 가능
          if (result.reply.authorType !== "API") {
            return apiError("Cannot delete replies created by admin", 403);
          }

          // 6. 삭제
          await deleteReply(params.replyId);

          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          });
        } catch (error) {
          console.error("Reply delete error:", error);
          return apiError("Internal server error", 500);
        }
      },

      OPTIONS: async () => apiOptions(),
    },
  },
});

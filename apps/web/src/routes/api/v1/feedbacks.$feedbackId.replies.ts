import { createFileRoute } from "@tanstack/react-router";
import { getFeedbackWithReplies, createReply } from "@sori/database";
import { authenticateApiKey, apiError, apiSuccess, apiOptions } from "@/lib/api-auth";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { z } from "zod";

const CreateReplySchema = z.object({
  content: z.string().min(1).max(10000),
  authorName: z.string().max(100).optional(),
});

export const Route = createFileRoute("/api/v1/feedbacks/$feedbackId/replies")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
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
          // 3. 피드백 존재 및 소유권 확인
          const feedback = await getFeedbackWithReplies(params.feedbackId);

          if (!feedback || feedback.projectId !== auth.project.id) {
            return apiError("Feedback not found", 404);
          }

          // 4. 요청 바디 파싱
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return apiError("Invalid JSON body", 400);
          }

          // 5. 유효성 검사
          const parsed = CreateReplySchema.safeParse(body);
          if (!parsed.success) {
            return apiError("Validation error", 400, {
              details: parsed.error.flatten(),
            });
          }

          // 6. Reply 생성
          const reply = await createReply({
            feedbackId: params.feedbackId,
            content: parsed.data.content,
            authorName: parsed.data.authorName || "API",
            authorType: "API",
            isInternal: false, // API를 통한 답변은 public
          });

          const response = apiSuccess(reply, 201);
          response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
          response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
          return response;
        } catch (error) {
          console.error("Reply creation error:", error);
          return apiError("Internal server error", 500);
        }
      },

      OPTIONS: async () => apiOptions(),
    },
  },
});

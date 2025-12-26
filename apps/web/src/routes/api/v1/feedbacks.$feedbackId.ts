import { createFileRoute } from "@tanstack/react-router";
import { getFeedbackWithReplies, updateFeedback } from "@sori/database";
import { authenticateApiKey, apiError, apiSuccess, apiOptions } from "@/lib/api-auth";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { z } from "zod";

const UpdateFeedbackSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable().optional(),
});

export const Route = createFileRoute("/api/v1/feedbacks/$feedbackId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
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
          // 3. 피드백 조회
          const feedback = await getFeedbackWithReplies(params.feedbackId);

          if (!feedback) {
            return apiError("Feedback not found", 404);
          }

          // 4. 소유권 확인
          if (feedback.projectId !== auth.project.id) {
            return apiError("Feedback not found", 404); // 404로 정보 유출 방지
          }

          // 5. isInternal이 true인 replies 필터링 (API에서는 내부 메모 노출 안함)
          const publicReplies = feedback.replies.filter((r) => !r.isInternal);

          const response = apiSuccess({ ...feedback, replies: publicReplies });
          response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
          response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
          return response;
        } catch (error) {
          console.error("Feedback detail error:", error);
          return apiError("Internal server error", 500);
        }
      },

      PATCH: async ({ request, params }) => {
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
          const existingFeedback = await getFeedbackWithReplies(params.feedbackId);

          if (!existingFeedback || existingFeedback.projectId !== auth.project.id) {
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
          const parsed = UpdateFeedbackSchema.safeParse(body);
          if (!parsed.success) {
            return apiError("Validation error", 400, {
              details: parsed.error.flatten(),
            });
          }

          // 6. 업데이트
          const updated = await updateFeedback({
            id: params.feedbackId,
            ...parsed.data,
          });

          const response = apiSuccess(updated);
          response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
          response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
          return response;
        } catch (error) {
          console.error("Feedback update error:", error);
          return apiError("Internal server error", 500);
        }
      },

      OPTIONS: async () => apiOptions(),
    },
  },
});

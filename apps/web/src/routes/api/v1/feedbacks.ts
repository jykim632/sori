import { createFileRoute } from "@tanstack/react-router";
import { getFeedbacksWithPagination, type FeedbackStatus, type FeedbackType, type Priority } from "@sori/database";
import { authenticateApiKey, apiError, apiSuccess, apiOptions } from "@/lib/api-auth";
import { checkApiRateLimit } from "@/lib/api-rate-limit";

export const Route = createFileRoute("/api/v1/feedbacks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // 1. 인증
        const auth = await authenticateApiKey(request);
        if (!auth.success) {
          return apiError(auth.error, auth.status);
        }

        // 2. Rate limiting
        const rateLimit = checkApiRateLimit(auth.project.apiKey!);
        if (!rateLimit.allowed) {
          const response = apiError("Rate limit exceeded", 429, {
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          });
          response.headers.set("X-RateLimit-Remaining", "0");
          response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
          return response;
        }

        try {
          // 3. 쿼리 파라미터 파싱
          const url = new URL(request.url);
          const status = url.searchParams.get("status") as FeedbackStatus | null;
          const type = url.searchParams.get("type") as FeedbackType | null;
          const priority = url.searchParams.get("priority") as Priority | null;
          const page = parseInt(url.searchParams.get("page") || "1", 10);
          const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
          const orderBy = (url.searchParams.get("orderBy") || "createdAt") as "createdAt" | "updatedAt";
          const order = (url.searchParams.get("order") || "desc") as "asc" | "desc";

          // 4. 데이터 조회
          const result = await getFeedbacksWithPagination({
            projectId: auth.project.id,
            status: status || undefined,
            type: type || undefined,
            priority: priority || undefined,
            page,
            limit,
            orderBy,
            order,
          });

          // 5. 응답
          const response = apiSuccess(result);
          response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
          response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
          return response;
        } catch (error) {
          console.error("Feedbacks list error:", error);
          return apiError("Internal server error", 500);
        }
      },
      OPTIONS: async () => apiOptions(),
    },
  },
});

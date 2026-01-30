import { createFileRoute } from "@tanstack/react-router";
import {
  getFeedbackByToken,
  getFeedbackWithRepliesByToken,
  updateTokenAccessedAt,
  isTokenExpired,
} from "@sori/database";
import { createRateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/api-utils";

const ticketViewLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.ticketView);
setInterval(() => ticketViewLimiter.cleanup(), 60000);

// CORS headers for public API
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/v1/tickets/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { token } = params;

        try {
          // Validate token format
          if (!token || !UUID_REGEX.test(token)) {
            return new Response(
              JSON.stringify({ error: "Invalid token format" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // Rate limiting
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";

          if (!ticketViewLimiter.check(ip).allowed) {
            return new Response(
              JSON.stringify({ error: "Too many requests. Please try again later." }),
              {
                status: 429,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // Get feedback by token
          const feedback = await getFeedbackByToken(token);

          if (!feedback) {
            return new Response(
              JSON.stringify({ error: "Ticket not found" }),
              {
                status: 404,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // Check if token is expired (6 months)
          if (isTokenExpired(feedback)) {
            return new Response(
              JSON.stringify({ error: "This link has expired" }),
              {
                status: 410,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // Update token accessed time
          await updateTokenAccessedAt(token);

          // Get feedback with replies (excluding internal notes)
          const feedbackWithReplies = await getFeedbackWithRepliesByToken(token);

          if (!feedbackWithReplies) {
            return new Response(
              JSON.stringify({ error: "Ticket not found" }),
              {
                status: 404,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // Determine if customer can reply (only OPEN or IN_PROGRESS)
          const canReply = ["OPEN", "IN_PROGRESS"].includes(feedbackWithReplies.status);

          // Build response
          const response = {
            feedback: {
              id: feedbackWithReplies.id,
              type: feedbackWithReplies.type,
              message: feedbackWithReplies.message,
              status: feedbackWithReplies.status,
              createdAt: feedbackWithReplies.createdAt,
              resolvedAt: feedbackWithReplies.resolvedAt,
            },
            project: feedback.project,
            replies: feedbackWithReplies.replies.map((reply) => ({
              id: reply.id,
              content: reply.content,
              authorName: reply.authorName,
              authorType: reply.authorType,
              createdAt: reply.createdAt,
            })),
            canReply,
          };

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        } catch (error) {
          console.error("Ticket fetch error:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            }
          );
        }
      },
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      },
    },
  },
});

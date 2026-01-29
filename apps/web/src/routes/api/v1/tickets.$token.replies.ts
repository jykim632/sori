import { createFileRoute } from "@tanstack/react-router";
import {
  getFeedbackByToken,
  isTokenExpired,
  updateTokenAccessedAt,
  createReply,
  getProjectWithWebhooks,
} from "@sori/database";
import { z } from "zod";

// Zod schema for customer reply request body
const CustomerReplySchema = z.object({
  content: z
    .string({ required_error: "Content is required" })
    .trim()
    .min(1, "Content cannot be empty")
    .max(5000, "Content too long (max 5000 characters)"),
});

// Rate limiting (in-memory, per IP + token)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 replies per minute
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimitMap) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

// CORS headers for public API
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// XSS prevention: escape HTML entities
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

export const Route = createFileRoute("/api/v1/tickets/$token/replies")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
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

          // Rate limiting (by IP + token)
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";
          const rateLimitKey = `${ip}:${token}`;

          if (!checkRateLimit(rateLimitKey)) {
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

          // Check if feedback is in a state that allows replies
          if (!["OPEN", "IN_PROGRESS"].includes(feedback.status)) {
            return new Response(
              JSON.stringify({
                error: "This ticket is closed. Please submit a new inquiry.",
              }),
              {
                status: 403,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // Parse and validate request body with Zod
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return new Response(
              JSON.stringify({ error: "Invalid JSON body" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          const parseResult = CustomerReplySchema.safeParse(body);
          if (!parseResult.success) {
            const errorMessage = parseResult.error.errors[0]?.message || "Invalid request";
            return new Response(
              JSON.stringify({ error: errorMessage }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          const trimmedContent = parseResult.data.content;

          // Create reply (XSS protection applied on display, not storage)
          const reply = await createReply({
            feedbackId: feedback.id,
            content: trimmedContent,
            authorId: null, // Customer has no user ID
            authorName: feedback.email, // Use email as author name
            authorType: "CUSTOMER",
            isInternal: false, // Customer replies are always public
          });

          // Update token accessed time
          await updateTokenAccessedAt(token);

          // Send webhook notification to admin (fire and forget)
          sendAdminNotification(feedback, trimmedContent).catch(console.error);

          return new Response(
            JSON.stringify({
              id: reply.id,
              createdAt: reply.createdAt,
            }),
            {
              status: 201,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            }
          );
        } catch (error) {
          console.error("Reply creation error:", error);
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

// Send notification to admin when customer replies
async function sendAdminNotification(
  feedback: { id: string; email: string; projectId: string; type: string },
  replyContent: string
) {
  try {
    const project = await getProjectWithWebhooks(feedback.projectId);
    if (!project) return;

    const webhooks = project.organization.webhooks.filter((w) => w.enabled);

    for (const webhook of webhooks) {
      const typeLabels: Record<string, string> = {
        BUG: "Bug Report",
        INQUIRY: "Question",
        FEATURE: "Feature Request",
      };

      let payload: unknown;

      if (webhook.type === "SLACK") {
        payload = {
          text: `New customer reply on ${typeLabels[feedback.type] || feedback.type}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Customer Reply* on *${typeLabels[feedback.type] || feedback.type}*\n\n${replyContent.substring(0, 500)}${replyContent.length > 500 ? "..." : ""}`,
              },
            },
            {
              type: "context",
              elements: [
                { type: "mrkdwn", text: `From: ${feedback.email}` },
                {
                  type: "mrkdwn",
                  text: `<${process.env.APP_URL || "https://web.sori.life"}/admin/feedbacks?id=${feedback.id}|View in Dashboard>`,
                },
              ],
            },
          ],
        };
      } else if (webhook.type === "DISCORD") {
        payload = {
          embeds: [
            {
              title: "Customer Reply",
              description: replyContent.substring(0, 500) + (replyContent.length > 500 ? "..." : ""),
              color: 0x00bfff,
              footer: { text: `From ${feedback.email} | ${project.name}` },
            },
          ],
        };
      } else {
        payload = {
          type: "customer_reply",
          feedback: {
            id: feedback.id,
            type: feedback.type,
            email: feedback.email,
          },
          reply: {
            content: replyContent,
            createdAt: new Date().toISOString(),
          },
          url: `${process.env.APP_URL || "https://web.sori.life"}/admin/feedbacks?id=${feedback.id}`,
        };
      }

      // Send with timeout
      fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }).catch(console.error);
    }
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}

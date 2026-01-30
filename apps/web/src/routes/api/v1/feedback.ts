import { createFileRoute } from "@tanstack/react-router";
import {
  getProjectWithWebhooks,
  createFeedback,
  getActiveNotificationSetting,
  type FeedbackType,
} from "@sori/database";
import { sendProjectNotifications } from "@/lib/notification";
import { isOriginAllowed, getCorsHeaders, DEFAULT_CORS_HEADERS } from "@/lib/api-utils/cors";
import { sendWebhook } from "@/lib/webhook/sender";

// Simple rate limiting (in-memory, per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

// Periodic cleanup of expired entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Enforces per-IP rate limiting using an in-memory sliding window.
 *
 * Updates the internal rate limit counters for `ip`, creating a new window if none exists or the previous window expired.
 *
 * @param ip - The client IP address to check and record a request for
 * @returns `true` if the request is allowed (counter incremented or new window started), `false` if the IP has exceeded the allowed requests for the current window
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  limit.count++;
  return true;
}

export const Route = createFileRoute("/api/v1/feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");

        try {
          // Rate limiting
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";

          if (!checkRateLimit(ip)) {
            return new Response(
              JSON.stringify({ error: "Too many requests" }),
              {
                status: 429,
                headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
              }
            );
          }

          const body = await request.json();
          const { type, message, email, metadata } = body;
          // Support both header and body for projectId
          const projectId = request.headers.get("X-Project-Id") || body.projectId;

          // Validate required fields (email is now required)
          if (!projectId || !type || !message || !email) {
            return new Response(
              JSON.stringify({ error: "Missing required fields (projectId, type, message, email are required)" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
              }
            );
          }

          // Validate type
          if (!["BUG", "INQUIRY", "FEATURE"].includes(type)) {
            return new Response(
              JSON.stringify({ error: "Invalid feedback type" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
              }
            );
          }

          // Validate message length
          if (message.length > 5000) {
            return new Response(
              JSON.stringify({ error: "Message too long" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
              }
            );
          }

          // Validate email format (email is required)
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(
              JSON.stringify({ error: "Invalid email format" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
              }
            );
          }

          // Get project with webhooks
          const project = await getProjectWithWebhooks(projectId);

          if (!project) {
            return new Response(
              JSON.stringify({ error: "Project not found" }),
              {
                status: 404,
                headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
              }
            );
          }

          // 프로젝트 조회 후 동적 CORS 헤더 생성
          const corsHeaders = getCorsHeaders(origin, project.allowedOrigins);

          // Check origin
          if (origin && !isOriginAllowed(origin, project.allowedOrigins)) {
            return new Response(
              JSON.stringify({ error: "Origin not allowed" }),
              {
                status: 403,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          // Create feedback with privacy consent timestamp
          const feedback = await createFeedback({
            type: type as FeedbackType,
            message,
            email,
            metadata: metadata || null,
            projectId,
            privacyAgreedAt: new Date(),
          });

          // Send webhooks (fire and forget)
          const webhooks = project.organization.webhooks.filter((w) => w.enabled);
          for (const webhook of webhooks) {
            sendWebhook(webhook, feedback, project.name).catch(console.error);
          }

          // Send project notifications (fire and forget)
          const notificationSetting = await getActiveNotificationSetting(projectId);
          console.log("[notification] projectId:", projectId, "setting:", notificationSetting ? {
            emailEnabled: notificationSetting.emailEnabled,
            emailRecipients: notificationSetting.emailRecipients,
            slackEnabled: notificationSetting.slackEnabled,
            slackWebhookUrl: notificationSetting.slackWebhookUrl ? "[SET]" : null,
          } : null);
          if (notificationSetting) {
            const appUrl = process.env.APP_URL || "https://app.sori.life";
            sendProjectNotifications(notificationSetting, {
              feedback: {
                id: feedback.id,
                type: feedback.type,
                message: feedback.message,
                email: feedback.email,
                metadata: feedback.metadata,
              },
              project: {
                id: project.id,
                name: project.name,
              },
              dashboardUrl: `${appUrl}/admin/feedbacks/${feedback.id}`,
            }).catch((err) => {
              console.error("[notification] dispatch failed:", err);
            });
          }

          return new Response(
            JSON.stringify({ success: true, id: feedback.id }),
            {
              status: 201,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } catch (error) {
          console.error("Feedback submission error:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...DEFAULT_CORS_HEADERS },
            }
          );
        }
      },
      OPTIONS: async ({ request }) => {
        // OPTIONS는 projectId를 body에서 읽을 수 없으므로 헤더에서만 확인
        const projectId = request.headers.get("X-Project-Id");

        if (projectId) {
          const project = await getProjectWithWebhooks(projectId);
          if (project) {
            const origin = request.headers.get("origin");
            const corsHeaders = getCorsHeaders(origin, project.allowedOrigins);
            return new Response(null, { status: 204, headers: corsHeaders });
          }
        }

        // projectId 없거나 프로젝트 없으면 기본 CORS
        return new Response(null, { status: 204, headers: DEFAULT_CORS_HEADERS });
      },
    },
  },
});
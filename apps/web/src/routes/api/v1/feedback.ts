import { createFileRoute } from "@tanstack/react-router";
import {
  getProjectWithWebhooks,
  createFeedback,
  getActiveNotificationSetting,
  type FeedbackType,
} from "@sori/database";
import { sendProjectNotifications } from "@/lib/notification";

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

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some((allowed) => {
    if (allowed === "*" || allowed === origin) return true;

    if (allowed.startsWith("*.")) {
      const baseDomain = allowed.slice(2);
      try {
        const originUrl = new URL(origin);
        return (
          originUrl.hostname === baseDomain ||
          originUrl.hostname.endsWith("." + baseDomain)
        );
      } catch {
        return false;
      }
    }
    return false;
  });
}

// CORS 헤더 생성 (동적 Origin)
function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  // Origin이 허용 목록에 있으면 해당 Origin 반환, 아니면 첫 번째 허용 Origin
  const allowedOrigin = origin && isOriginAllowed(origin, allowedOrigins)
    ? origin
    : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Project-Id",
    "Access-Control-Allow-Credentials": "true",
  };
}

// 프로젝트 조회 전 사용하는 기본 CORS (에러 응답용)
const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Project-Id",
};

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

// ============================================
// Webhook 보안
// ============================================

// 허용된 Webhook 호스트 (SSRF 방지)
const ALLOWED_WEBHOOK_HOSTS = [
  "hooks.slack.com",
  "discord.com",
  "discordapp.com",
  "api.telegram.org",
];

// 차단할 호스트 패턴 (내부 네트워크)
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
];

function isWebhookUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);

    // HTTPS만 허용 (CUSTOM 타입 제외하고)
    if (parsed.protocol !== "https:") {
      return false;
    }

    // 내부 네트워크 차단
    if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
      return false;
    }

    // 허용된 호스트만 통과
    const isAllowedHost = ALLOWED_WEBHOOK_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith("." + host)
    );

    return isAllowedHost;
  } catch {
    return false;
  }
}

// Webhook sending
async function sendWebhook(
  webhook: { url: string; type: string },
  feedback: { type: string; message: string; email: string | null },
  projectName: string
) {
  // URL 검증
  if (!isWebhookUrlAllowed(webhook.url)) {
    console.warn(`Blocked webhook URL: ${webhook.url}`);
    return;
  }

  const typeLabels: Record<string, string> = {
    BUG: "Bug Report",
    INQUIRY: "Question",
    FEATURE: "Feature Request",
  };

  let payload: unknown;

  if (webhook.type === "SLACK") {
    payload = {
      text: `New ${typeLabels[feedback.type] || feedback.type} from ${projectName}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${typeLabels[feedback.type] || feedback.type}* from *${projectName}*\n\n${feedback.message}`,
          },
        },
        ...(feedback.email
          ? [
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: `Email: ${feedback.email}` }],
              },
            ]
          : []),
      ],
    };
  } else if (webhook.type === "DISCORD") {
    payload = {
      embeds: [
        {
          title: `${typeLabels[feedback.type] || feedback.type}`,
          description: feedback.message,
          color: feedback.type === "BUG" ? 0xff0000 : feedback.type === "FEATURE" ? 0x00ff00 : 0x0000ff,
          footer: { text: `From ${projectName}` },
          fields: feedback.email
            ? [{ name: "Email", value: feedback.email }]
            : [],
        },
      ],
    };
  } else {
    payload = {
      type: feedback.type,
      message: feedback.message,
      email: feedback.email,
      project: projectName,
    };
  }

  // 타임아웃 5초
  await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
}

import { createFileRoute } from "@tanstack/react-router";
import {
  getProjectWithWebhooks,
  createFeedback,
  type FeedbackType,
} from "@sori/database";

// Simple rate limiting (in-memory, per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 10) {
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

export const Route = createFileRoute("/api/v1/feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        };

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
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          const body = await request.json();
          const { projectId, type, message, email, metadata } = body;

          // Validate required fields
          if (!projectId || !type || !message) {
            return new Response(
              JSON.stringify({ error: "Missing required fields" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          // Validate type
          if (!["BUG", "INQUIRY", "FEATURE"].includes(type)) {
            return new Response(
              JSON.stringify({ error: "Invalid feedback type" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          // Validate message length
          if (message.length > 5000) {
            return new Response(
              JSON.stringify({ error: "Message too long" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          // Validate email format if provided
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(
              JSON.stringify({ error: "Invalid email format" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
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
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          // Check origin
          const origin = request.headers.get("origin");
          if (origin && !isOriginAllowed(origin, project.allowedOrigins)) {
            return new Response(
              JSON.stringify({ error: "Origin not allowed" }),
              {
                status: 403,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }

          // Create feedback
          const feedback = await createFeedback({
            type: type as FeedbackType,
            message,
            email: email || null,
            metadata: metadata || null,
            projectId,
          });

          // Send webhooks (fire and forget)
          const webhooks = project.organization.webhooks.filter((w) => w.enabled);
          for (const webhook of webhooks) {
            sendWebhook(webhook, feedback, project.name).catch(console.error);
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
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      },
    },
  },
});

// Webhook sending
async function sendWebhook(
  webhook: { url: string; type: string },
  feedback: { type: string; message: string; email: string | null },
  projectName: string
) {
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

  await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

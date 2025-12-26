import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@sori/database";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Validate origin against allowed origins with proper wildcard handling
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some((allowed) => {
    // Exact match or wildcard all
    if (allowed === "*" || allowed === origin) return true;

    // Wildcard subdomain matching (e.g., "*.example.com")
    if (allowed.startsWith("*.")) {
      const baseDomain = allowed.slice(2); // Remove "*."
      try {
        const originUrl = new URL(origin);
        const originHost = originUrl.hostname;
        // Must match exactly the base domain OR be a subdomain
        return originHost === baseDomain || originHost.endsWith("." + baseDomain);
      } catch {
        return false;
      }
    }

    return false;
  });
}

// Get CORS headers for validated origin
function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!origin) return headers;

  if (isOriginAllowed(origin, allowedOrigins)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

// Input validation constants
const MAX_MESSAGE_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254;
const MAX_METADATA_SIZE = 10000; // 10KB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Get type emoji and label
function getTypeInfo(type: string) {
  switch (type) {
    case "BUG": return { emoji: "🐛", label: "버그 리포트" };
    case "FEATURE": return { emoji: "💡", label: "기능 요청" };
    case "INQUIRY": return { emoji: "❓", label: "문의" };
    default: return { emoji: "📝", label: type };
  }
}

// Format payload for different webhook services
function formatWebhookPayload(
  webhookUrl: string,
  feedback: { id: string; type: string; message: string; email: string | null; metadata: unknown },
  project: { id: string; name: string },
  organization: { id: string; name: string },
  isTest = false
) {
  const typeInfo = getTypeInfo(feedback.type);
  const metadata = feedback.metadata as { url?: string } | null;
  const eventLabel = isTest ? "🔔 웹훅 테스트" : "🔔 새 피드백";

  // Slack format
  if (webhookUrl.includes("hooks.slack.com")) {
    return {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: eventLabel, emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*유형:*\n${typeInfo.emoji} ${typeInfo.label}` },
            { type: "mrkdwn", text: `*프로젝트:*\n${project.name}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*메시지:*\n${feedback.message}` },
        },
        ...(feedback.email
          ? [{ type: "section", fields: [{ type: "mrkdwn", text: `*이메일:*\n${feedback.email}` }] }]
          : []),
        ...(metadata?.url
          ? [{ type: "context", elements: [{ type: "mrkdwn", text: `📍 ${metadata.url}` }] }]
          : []),
      ],
    };
  }

  // Discord format
  if (webhookUrl.includes("discord.com/api/webhooks")) {
    return {
      embeds: [
        {
          title: eventLabel,
          color: feedback.type === "BUG" ? 0xef4444 : feedback.type === "FEATURE" ? 0x8b5cf6 : 0x3b82f6,
          fields: [
            { name: "유형", value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
            { name: "프로젝트", value: project.name, inline: true },
            { name: "메시지", value: feedback.message },
            ...(feedback.email ? [{ name: "이메일", value: feedback.email, inline: true }] : []),
            ...(metadata?.url ? [{ name: "URL", value: metadata.url }] : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  // Telegram format (Bot API)
  if (webhookUrl.includes("api.telegram.org")) {
    const lines = [
      `<b>${eventLabel}</b>`,
      ``,
      `${typeInfo.emoji} <b>유형:</b> ${typeInfo.label}`,
      `📁 <b>프로젝트:</b> ${project.name}`,
      ``,
      `💬 <b>메시지:</b>`,
      feedback.message,
    ];
    if (feedback.email) {
      lines.push(``, `📧 <b>이메일:</b> ${feedback.email}`);
    }
    if (metadata?.url) {
      lines.push(``, `🔗 ${metadata.url}`);
    }

    return {
      text: lines.join("\n"),
      parse_mode: "HTML",
    };
  }

  // Generic JSON format (for custom webhooks)
  return {
    event: isTest ? "webhook.test" : "feedback.created",
    timestamp: new Date().toISOString(),
    feedback: {
      id: feedback.id,
      type: feedback.type,
      message: feedback.message,
      email: feedback.email,
      metadata: feedback.metadata,
    },
    project: { id: project.id, name: project.name },
    organization: { id: organization.id, name: organization.name },
  };
}

// Send webhook notification (fire and forget)
async function sendWebhook(
  webhookUrl: string,
  feedback: { id: string; type: string; message: string; email: string | null; metadata: unknown },
  project: { id: string; name: string },
  organization: { id: string; name: string }
) {
  try {
    const payload = formatWebhookPayload(webhookUrl, feedback, project, organization);

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Sori-Webhook/1.0",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Log but don't throw - webhook failures shouldn't affect the response
    console.error("Webhook delivery failed:", error);
  }
}

export const Route = createFileRoute("/api/v1/feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Rate limiting
          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";

          if (!checkRateLimit(ip)) {
            return new Response(
              JSON.stringify({ error: "Too many requests. Please try again later." }),
              { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
            );
          }

          // Parse request body
          const body = await request.json();
          const { projectId, type, message, email, metadata } = body;

          // Validate required fields
          if (!projectId || !type || !message) {
            return new Response(
              JSON.stringify({ error: "Missing required fields" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Validate type
          if (!["BUG", "INQUIRY", "FEATURE"].includes(type)) {
            return new Response(
              JSON.stringify({ error: "Invalid feedback type" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Validate message
          if (typeof message !== "string" || message.trim().length === 0) {
            return new Response(
              JSON.stringify({ error: "Message is required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (message.length > MAX_MESSAGE_LENGTH) {
            return new Response(
              JSON.stringify({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Validate email if provided
          if (email !== undefined && email !== null && email !== "") {
            if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
              return new Response(
                JSON.stringify({ error: "Invalid email format" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          // Validate metadata size if provided
          if (metadata !== undefined) {
            const metadataStr = JSON.stringify(metadata);
            if (metadataStr.length > MAX_METADATA_SIZE) {
              return new Response(
                JSON.stringify({ error: "Metadata too large" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          // Verify project exists and get organization with webhooks
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
              id: true,
              name: true,
              allowedOrigins: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  webhookUrl: true, // Legacy single webhook (backward compatibility)
                  webhooks: {
                    where: { enabled: true },
                    select: { url: true },
                  },
                },
              },
            },
          });

          if (!project) {
            return new Response(
              JSON.stringify({ error: "Project not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }

          // Check origin
          const origin = request.headers.get("origin");
          if (origin && !isOriginAllowed(origin, project.allowedOrigins)) {
            return new Response(
              JSON.stringify({ error: "Origin not allowed" }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }

          // Create feedback
          const feedback = await prisma.feedback.create({
            data: {
              projectId,
              type,
              message: message.trim(),
              email: email?.trim() || null,
              metadata: metadata || undefined,
            },
          });

          // Send webhook notifications (fire and forget - don't await)
          const feedbackData = { id: feedback.id, type, message: message.trim(), email: email?.trim() || null, metadata };
          const projectData = { id: project.id, name: project.name };
          const orgData = { id: project.organization.id, name: project.organization.name };

          // Send to all enabled webhooks
          for (const webhook of project.organization.webhooks) {
            sendWebhook(webhook.url, feedbackData, projectData, orgData);
          }

          // Also send to legacy webhookUrl if set (backward compatibility)
          if (project.organization.webhookUrl) {
            const isAlreadySent = project.organization.webhooks.some(w => w.url === project.organization.webhookUrl);
            if (!isAlreadySent) {
              sendWebhook(project.organization.webhookUrl, feedbackData, projectData, orgData);
            }
          }

          return new Response(
            JSON.stringify({ success: true, id: feedback.id }),
            {
              status: 201,
              headers: getCorsHeaders(origin, project.allowedOrigins),
            }
          );
        } catch (error) {
          console.error("Feedback API error:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },

      // Handle CORS preflight
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");

        // For preflight, we need to check if origin would be allowed
        // Since we don't have projectId in OPTIONS, allow the preflight
        // The actual POST will validate the origin properly
        const headers: Record<string, string> = {
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        };

        if (origin) {
          headers["Access-Control-Allow-Origin"] = origin;
          headers["Vary"] = "Origin";
        }

        return new Response(null, { status: 204, headers });
      },
    },
  },
});

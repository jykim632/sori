import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@sori/database";

export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; slug: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { name, slug, userId } = data;

    // Check if slug is already taken
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new Error("이미 사용 중인 URL입니다");
    }

    // Create organization with the user as OWNER
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    return org;
  });

// Get all organizations the user belongs to
export const getUserOrganizations = createServerFn({ method: "GET" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: data.userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  });

// Get first organization (for backward compatibility)
export const getUserOrganization = createServerFn({ method: "GET" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: data.userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    return membership?.organization || null;
  });

export const getOrganizationWithProjects = createServerFn({ method: "GET" })
  .inputValidator((d: { organizationId: string }) => d)
  .handler(async ({ data }) => {
    return await prisma.organization.findUnique({
      where: { id: data.organizationId },
      include: {
        projects: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  });

// Get user's role in a specific organization
export const getUserRoleInOrganization = createServerFn({ method: "GET" })
  .inputValidator((d: { userId: string; organizationId: string }) => d)
  .handler(async ({ data }) => {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: data.userId,
          organizationId: data.organizationId,
        },
      },
    });

    return membership?.role || null;
  });

// Update organization webhook URL
export const updateOrganizationWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { organizationId: string; webhookUrl: string | null }) => d)
  .handler(async ({ data }) => {
    const { organizationId, webhookUrl } = data;

    // Validate URL if provided
    if (webhookUrl) {
      try {
        new URL(webhookUrl);
      } catch {
        throw new Error("유효한 URL을 입력해주세요");
      }
    }

    return await prisma.organization.update({
      where: { id: organizationId },
      data: { webhookUrl },
    });
  });

// Get type emoji and label for webhook formatting
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
  feedback: { id: string; type: string; message: string; email: string | null; metadata: { url?: string } | null },
  project: { id: string; name: string },
  organization: { id: string; name: string },
  isTest = false
) {
  const typeInfo = getTypeInfo(feedback.type);
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
        ...(feedback.metadata?.url
          ? [{ type: "context", elements: [{ type: "mrkdwn", text: `📍 ${feedback.metadata.url}` }] }]
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
            ...(feedback.metadata?.url ? [{ name: "URL", value: feedback.metadata.url }] : []),
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
    if (feedback.metadata?.url) {
      lines.push(``, `🔗 ${feedback.metadata.url}`);
    }

    return {
      text: lines.join("\n"),
      parse_mode: "HTML",
    };
  }

  // Generic JSON format
  return {
    event: isTest ? "webhook.test" : "feedback.created",
    timestamp: new Date().toISOString(),
    feedback,
    project,
    organization,
  };
}

// Test webhook (server-side to avoid CORS)
export const testWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      webhookUrl: string;
      organizationId: string;
      organizationName: string;
      projectId?: string;
      projectName?: string;
    }) => d
  )
  .handler(async ({ data }) => {
    const { webhookUrl, organizationId, organizationName, projectId, projectName } = data;

    const testFeedback = {
      id: "test_" + Date.now(),
      type: "BUG",
      message: "이것은 테스트 피드백입니다.",
      email: "test@example.com",
      metadata: { url: "https://example.com" },
    };

    const testPayload = formatWebhookPayload(
      webhookUrl,
      testFeedback,
      { id: projectId || "test_project", name: projectName || "Test Project" },
      { id: organizationId, name: organizationName },
      true
    );

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Sori-Webhook/1.0",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        return { success: true, message: `성공! (${response.status})` };
      } else {
        const text = await response.text().catch(() => "");
        return {
          success: false,
          message: `실패: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 100)}` : ""}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "연결 실패",
      };
    }
  });

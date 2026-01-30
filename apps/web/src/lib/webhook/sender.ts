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

export function isWebhookUrlAllowed(url: string): boolean {
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
export async function sendWebhook(
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
    signal: AbortSignal.timeout(10000),
  });
}

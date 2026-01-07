import type { NotificationContext, TypeInfo } from "../types";
import { TYPE_INFO_MAP } from "../types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function generateEmailHtml(context: NotificationContext): string {
  const { feedback, project, dashboardUrl } = context;
  const typeInfo: TypeInfo = TYPE_INFO_MAP[feedback.type];
  const rawPageUrl = feedback.metadata?.url;
  const pageUrl = typeof rawPageUrl === "string" && isSafeUrl(rawPageUrl) ? rawPageUrl : undefined;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새 피드백 - ${escapeHtml(project.name)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${typeInfo.color}; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                ${typeInfo.emoji} 새 피드백: ${escapeHtml(typeInfo.label)}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <!-- Project -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">프로젝트</p>
              <p style="margin: 0 0 20px; color: #111827; font-size: 16px; font-weight: 500;">${escapeHtml(project.name)}</p>

              <!-- Message -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">내용</p>
              <div style="margin: 0 0 20px; padding: 16px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid ${typeInfo.color};">
                <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(feedback.message)}</p>
              </div>

              ${
                feedback.email
                  ? `
              <!-- Customer Email -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">고객 이메일</p>
              <p style="margin: 0 0 20px; color: #111827; font-size: 15px;">
                <a href="mailto:${escapeHtml(feedback.email)}" style="color: #3B82F6; text-decoration: none;">${escapeHtml(feedback.email)}</a>
              </p>
              `
                  : ""
              }

              ${
                pageUrl
                  ? `
              <!-- Page URL -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">접수 페이지</p>
              <p style="margin: 0 0 20px; color: #111827; font-size: 15px; word-break: break-all;">
                <a href="${escapeHtml(pageUrl)}" style="color: #3B82F6; text-decoration: none;">${escapeHtml(pageUrl)}</a>
              </p>
              `
                  : ""
              }

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; padding: 12px 32px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
                      대시보드에서 확인하기
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                이 메일은 Sori 알림 설정에 의해 자동 발송되었습니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateEmailSubject(context: NotificationContext): string {
  const { feedback, project } = context;
  const typeInfo = TYPE_INFO_MAP[feedback.type];
  const safeName = project.name.replace(/[\r\n]/g, " ");
  return `[${safeName}] ${typeInfo.emoji} ${typeInfo.label}`;
}

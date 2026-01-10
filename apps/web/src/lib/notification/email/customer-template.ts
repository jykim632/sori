import type { FeedbackType } from "@sori/database";
import { TYPE_INFO_MAP } from "../types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface CustomerReplyContext {
  feedback: {
    type: FeedbackType;
    message: string;
  };
  reply: {
    content: string;
    authorName: string;
  };
  project: {
    name: string;
  };
  ticketUrl: string;
}

export function generateCustomerReplyEmailHtml(context: CustomerReplyContext): string {
  const { feedback, reply, project, ticketUrl } = context;
  const typeInfo = TYPE_INFO_MAP[feedback.type];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>문의에 답변이 등록되었습니다 - ${escapeHtml(project.name)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #3B82F6; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                ${typeInfo.emoji} 문의에 답변이 등록되었습니다
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <!-- Project -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">서비스</p>
              <p style="margin: 0 0 20px; color: #111827; font-size: 16px; font-weight: 500;">${escapeHtml(project.name)}</p>

              <!-- Original Message -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">원본 문의 (${escapeHtml(typeInfo.label)})</p>
              <div style="margin: 0 0 20px; padding: 16px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #9CA3AF;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(feedback.message.length > 200 ? feedback.message.substring(0, 200) + "..." : feedback.message)}</p>
              </div>

              <!-- Reply -->
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                ${escapeHtml(reply.authorName || "담당자")}님의 답변
              </p>
              <div style="margin: 0 0 20px; padding: 16px; background-color: #EFF6FF; border-radius: 6px; border-left: 4px solid #3B82F6;">
                <p style="margin: 0; color: #1E40AF; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(reply.content)}</p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(ticketUrl)}" style="display: inline-block; padding: 12px 32px; background-color: #3B82F6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
                      전체 대화 확인하기
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #9CA3AF; font-size: 13px; text-align: center;">
                위 버튼을 클릭하시면 문의 내역을 확인하고 추가 메시지를 남기실 수 있습니다.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                이 메일은 ${escapeHtml(project.name)}에서 발송되었습니다.
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

export function generateCustomerReplyEmailSubject(context: CustomerReplyContext): string {
  const { project } = context;
  const safeName = project.name.replace(/[\r\n]/g, " ");
  return `[${safeName}] 문의에 답변이 등록되었습니다`;
}

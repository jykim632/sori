import { Resend } from "resend";
import {
  generateCustomerReplyEmailHtml,
  generateCustomerReplyEmailSubject,
  type CustomerReplyContext,
} from "./customer-template";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "noreply@mail.sori.life";

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

export async function sendCustomerReplyNotification(
  customerEmail: string,
  context: CustomerReplyContext
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: "Email notification is not configured (missing RESEND_API_KEY)",
    };
  }

  if (!customerEmail) {
    return {
      success: false,
      error: "Customer email is not provided",
    };
  }

  try {
    const subject = generateCustomerReplyEmailSubject(context);
    const html = generateCustomerReplyEmailHtml(context);

    // Sanitize project name to prevent email header injection (CRLF)
    const sanitizedProjectName = context.project.name
      .replace(/[\r\n]/g, "")
      .trim() || "Sori";

    const { error } = await resend.emails.send({
      from: `${sanitizedProjectName} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject,
      html,
    });

    if (error) {
      return {
        success: false,
        error: `Resend error: ${error.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
}

import { Resend } from "resend";
import type { NotificationSender, NotificationContext } from "../types";
import { generateEmailHtml, generateEmailSubject } from "./template";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "noreply@mail.sori.life";

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.warn("[notification] RESEND_API_KEY is not configured - email notifications disabled");
}

export function createEmailSender(recipients: string[]): NotificationSender {
  return {
    channel: "email",
    async send(context: NotificationContext): Promise<void> {
      if (!resend) {
        throw new Error("Email notification is not configured (missing RESEND_API_KEY)");
      }

      if (recipients.length === 0) {
        throw new Error("No email recipients configured");
      }

      const subject = generateEmailSubject(context);
      const html = generateEmailHtml(context);

      const { error } = await resend.emails.send({
        from: `Sori <${FROM_EMAIL}>`,
        to: recipients,
        subject,
        html,
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }
    },
  };
}

import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Resend } from "resend";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: pool,
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Sori <noreply@sori.life>",
        to: user.email,
        subject: "[Sori] 비밀번호 재설정",
        html: `
          <h2>비밀번호 재설정</h2>
          <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요.</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px;">비밀번호 재설정</a>
          <p style="margin-top: 16px; color: #666;">이 링크는 1시간 동안 유효합니다.</p>
        `,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Sori <noreply@sori.life>",
        to: user.email,
        subject: "[Sori] 이메일 인증",
        html: `
          <h2>이메일 인증</h2>
          <p>안녕하세요, ${user.name || "고객"}님!</p>
          <p>Sori 회원가입을 완료하려면 아래 버튼을 클릭하여 이메일을 인증해주세요.</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px;">이메일 인증하기</a>
          <p style="margin-top: 16px; color: #666;">이 링크는 24시간 동안 유효합니다.</p>
        `,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});

export type Session = typeof auth.$Infer.Session;

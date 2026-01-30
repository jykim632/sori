import { describe, it, expect } from "vitest";
import { UpdateNotificationSettingInputSchema } from "./server-input";

const base = {
  projectId: "proj-1",
  emailEnabled: false,
  emailRecipients: [],
  slackEnabled: false,
  slackWebhookUrl: null,
};

describe("UpdateNotificationSettingInputSchema", () => {
  // ─── TC1: 이메일 빈 수신자 차단 (핵심 버그) ───

  describe("이메일 빈 수신자 차단", () => {
    it("이메일 ON + 수신자 0명 → 실패", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: true,
        emailRecipients: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain(
          "이메일 알림을 활성화하려면 최소 1명의 수신자가 필요합니다"
        );
      }
    });
  });

  // ─── TC2: 이메일 정상 동작 (회귀 방지) ───

  describe("이메일 정상 동작", () => {
    it("이메일 ON + 유효 수신자 1명 → 성공", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: true,
        emailRecipients: ["test@example.com"],
      });
      expect(result.success).toBe(true);
    });

    it("이메일 ON + 유효 수신자 10명 → 성공", () => {
      const emails = Array.from(
        { length: 10 },
        (_, i) => `user${i}@example.com`
      );
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: true,
        emailRecipients: emails,
      });
      expect(result.success).toBe(true);
    });

    it("이메일 ON + 수신자 11명 → 실패 (최대 10명)", () => {
      const emails = Array.from(
        { length: 11 },
        (_, i) => `user${i}@example.com`
      );
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: true,
        emailRecipients: emails,
      });
      expect(result.success).toBe(false);
    });

    it("이메일 ON + 잘못된 형식 → 실패", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: true,
        emailRecipients: ["not-an-email"],
      });
      expect(result.success).toBe(false);
    });

    it("이메일 ON + 중복 이메일 → 실패", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: true,
        emailRecipients: ["a@example.com", "a@example.com"],
      });
      expect(result.success).toBe(false);
    });

    it("이메일 OFF + 수신자 0명 → 성공", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: false,
        emailRecipients: [],
      });
      expect(result.success).toBe(true);
    });

    it("이메일 OFF + 수신자 있음 → 성공", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        emailEnabled: false,
        emailRecipients: ["test@example.com"],
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── TC3: Slack 검증 ───

  describe("Slack 검증", () => {
    it("Slack ON + URL 없음(null) → 실패", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        slackEnabled: true,
        slackWebhookUrl: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain(
          "Slack 알림을 활성화하려면 Webhook URL이 필요합니다"
        );
      }
    });

    it("Slack ON + 유효한 hooks.slack.com URL → 성공", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        slackEnabled: true,
        slackWebhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
      });
      expect(result.success).toBe(true);
    });

    it("Slack ON + 잘못된 URL → 실패", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        slackEnabled: true,
        slackWebhookUrl: "https://evil.com/hook",
      });
      expect(result.success).toBe(false);
    });

    it("Slack OFF + URL 없음 → 성공", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        ...base,
        slackEnabled: false,
        slackWebhookUrl: null,
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── TC4: 복합 시나리오 ───

  describe("복합 시나리오", () => {
    it("이메일 ON + Slack ON + 모두 유효 → 성공", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        projectId: "proj-1",
        emailEnabled: true,
        emailRecipients: ["admin@example.com"],
        slackEnabled: true,
        slackWebhookUrl: "https://hooks.slack.com/services/T00/B00/xxx",
      });
      expect(result.success).toBe(true);
    });

    it("이메일 ON 빈 수신자 + Slack ON 빈 URL → 두 에러 모두 발생", () => {
      const result = UpdateNotificationSettingInputSchema.safeParse({
        projectId: "proj-1",
        emailEnabled: true,
        emailRecipients: [],
        slackEnabled: true,
        slackWebhookUrl: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join("."));
        expect(paths).toContain("emailRecipients");
        expect(paths).toContain("slackWebhookUrl");
      }
    });
  });
});

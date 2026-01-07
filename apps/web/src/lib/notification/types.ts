import type { Feedback, Project, FeedbackType } from "@sori/database";

export interface NotificationContext {
  feedback: Pick<Feedback, "id" | "type" | "message" | "email" | "metadata">;
  project: Pick<Project, "id" | "name">;
  dashboardUrl: string;
}

export interface NotificationSender {
  readonly channel: "email" | "slack";
  send(context: NotificationContext): Promise<void>;
}

export interface NotificationResult {
  channel: "email" | "slack";
  success: boolean;
  error?: string;
}

export interface TypeInfo {
  emoji: string;
  label: string;
  color: string;
}

export const TYPE_INFO_MAP: Record<FeedbackType, TypeInfo> = {
  BUG: { emoji: "🐛", label: "버그 리포트", color: "#EF4444" },
  FEATURE: { emoji: "💡", label: "기능 요청", color: "#22C55E" },
  INQUIRY: { emoji: "❓", label: "문의", color: "#3B82F6" },
};

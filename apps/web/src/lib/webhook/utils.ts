import type { FeedbackType } from "@sori/database";
import type { TypeInfo } from "./types";

const TYPE_INFO_MAP: Record<FeedbackType, TypeInfo> = {
  BUG: { emoji: "🐛", label: "버그 리포트" },
  FEATURE: { emoji: "💡", label: "기능 요청" },
  INQUIRY: { emoji: "❓", label: "문의" },
};

export function getTypeInfo(type: FeedbackType): TypeInfo {
  return TYPE_INFO_MAP[type];
}

export function getEventLabel(isTest: boolean): string {
  return isTest ? "🔔 웹훅 테스트" : "🔔 새 피드백";
}

import type { TypeInfo } from "./types";

export function getTypeInfo(type: string): TypeInfo {
  switch (type) {
    case "BUG":
      return { emoji: "🐛", label: "버그 리포트" };
    case "FEATURE":
      return { emoji: "💡", label: "기능 요청" };
    case "INQUIRY":
      return { emoji: "❓", label: "문의" };
    default:
      return { emoji: "📝", label: type };
  }
}

export function getEventLabel(isTest: boolean): string {
  return isTest ? "🔔 웹훅 테스트" : "🔔 새 피드백";
}

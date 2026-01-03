import { Bug, HelpCircle, Lightbulb, MessageSquare } from "lucide-react";
import { createElement } from "react";

export function getTypeIcon(type: string) {
  switch (type) {
    case "BUG":
      return createElement(Bug, { className: "w-4 h-4" });
    case "INQUIRY":
      return createElement(HelpCircle, { className: "w-4 h-4" });
    case "FEATURE":
      return createElement(Lightbulb, { className: "w-4 h-4" });
    default:
      return createElement(MessageSquare, { className: "w-4 h-4" });
  }
}

export function getTypeLabel(type: string) {
  switch (type) {
    case "BUG":
      return "버그 리포트";
    case "INQUIRY":
      return "문의";
    case "FEATURE":
      return "기능 요청";
    default:
      return type;
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "OPEN":
      return "대기중";
    case "IN_PROGRESS":
      return "처리중";
    case "RESOLVED":
      return "완료";
    case "CLOSED":
      return "닫힘";
    default:
      return status;
  }
}

export function getAuthorTypeLabel(type: string) {
  switch (type) {
    case "ADMIN":
      return "관리자";
    case "API":
      return "API";
    case "USER":
      return "사용자";
    default:
      return type;
  }
}

export function getWebhookTypeLabel(type: string) {
  switch (type) {
    case "SLACK":
      return "Slack";
    case "DISCORD":
      return "Discord";
    case "TELEGRAM":
      return "Telegram";
    default:
      return "Custom";
  }
}

export function getWebhookTypeColor(type: string) {
  switch (type) {
    case "SLACK":
      return "bg-purple-100 text-purple-700";
    case "DISCORD":
      return "bg-indigo-100 text-indigo-700";
    case "TELEGRAM":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function copyToClipboard(text: string, onCopied?: (id: string) => void, id?: string) {
  navigator.clipboard.writeText(text);
  if (onCopied && id) {
    onCopied(id);
  }
}

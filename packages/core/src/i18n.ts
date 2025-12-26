export const i18n = {
  ko: {
    greeting: "무엇을 도와드릴까요?",
    types: {
      BUG: "버그",
      INQUIRY: "문의",
      FEATURE: "제안",
    },
    placeholder: "내용을 입력해주세요...",
    emailPlaceholder: "이메일 (선택)",
    submit: "보내기",
    success: "피드백이 전송되었습니다!",
    error: "전송에 실패했습니다. 다시 시도해주세요.",
  },
  en: {
    greeting: "How can we help?",
    types: {
      BUG: "Bug",
      INQUIRY: "Question",
      FEATURE: "Feature",
    },
    placeholder: "Enter your message...",
    emailPlaceholder: "Email (optional)",
    submit: "Submit",
    success: "Feedback sent successfully!",
    error: "Failed to send. Please try again.",
  },
} as const;

export type Locale = keyof typeof i18n;

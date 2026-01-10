export const i18n = {
  ko: {
    greeting: "무엇을 도와드릴까요?",
    types: {
      BUG: "버그",
      INQUIRY: "문의",
      FEATURE: "제안",
    },
    placeholder: "내용을 입력해주세요...",
    emailPlaceholder: "이메일",
    submit: "보내기",
    success: "피드백이 전송되었습니다!",
    error: "전송에 실패했습니다. 다시 시도해주세요.",
    emailRequired: "이메일을 입력해주세요.",
    emailInvalid: "올바른 이메일 형식이 아닙니다.",
  },
  en: {
    greeting: "How can we help?",
    types: {
      BUG: "Bug",
      INQUIRY: "Question",
      FEATURE: "Feature",
    },
    placeholder: "Enter your message...",
    emailPlaceholder: "Email",
    submit: "Submit",
    success: "Feedback sent successfully!",
    error: "Failed to send. Please try again.",
    emailRequired: "Please enter your email.",
    emailInvalid: "Please enter a valid email address.",
  },
} as const;

export type Locale = keyof typeof i18n;

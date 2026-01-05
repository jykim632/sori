/**
 * 에러 코드 사전 (Error Code Dictionary)
 *
 * 카테고리:
 * - AUTH_xxx: 인증/권한 관련
 * - VAL_xxx: 입력값 검증 관련
 * - RES_xxx: 리소스 조회 관련
 * - LIMIT_xxx: 사용량 제한 관련
 */
export const ERROR_CODES = {
  // Auth (AUTH_xxx)
  AUTH_UNAUTHORIZED: { code: "AUTH_001", message: "로그인이 필요합니다" },
  AUTH_NOT_MEMBER: { code: "AUTH_002", message: "조직의 멤버가 아닙니다" },
  AUTH_ADMIN_REQUIRED: { code: "AUTH_003", message: "관리자 권한이 필요합니다" },

  // Validation (VAL_xxx)
  VAL_INVALID_URL: { code: "VAL_001", message: "유효한 URL을 입력해주세요" },
  VAL_REQUIRED_FIELDS: { code: "VAL_002", message: "필수 항목을 입력해주세요" },
  VAL_DUPLICATE_SLUG: { code: "VAL_003", message: "이미 사용 중인 URL입니다" },

  // Resource (RES_xxx)
  RES_ORG_NOT_FOUND: { code: "RES_001", message: "조직을 찾을 수 없습니다" },
  RES_PROJECT_NOT_FOUND: { code: "RES_002", message: "프로젝트를 찾을 수 없습니다" },
  RES_FEEDBACK_NOT_FOUND: { code: "RES_003", message: "피드백을 찾을 수 없습니다" },
  RES_WEBHOOK_NOT_FOUND: { code: "RES_004", message: "웹훅을 찾을 수 없습니다" },

  // Limit (LIMIT_xxx)
  LIMIT_WEBHOOK_EXCEEDED: {
    code: "LIMIT_001",
    message: "{plan} 플랜은 최대 {limit}개의 웹훅만 등록할 수 있습니다",
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * 애플리케이션 에러 클래스
 *
 * @example
 * // 기본 사용
 * throw new AppError("AUTH_UNAUTHORIZED");
 *
 * // 동적 메시지
 * throw new AppError("LIMIT_WEBHOOK_EXCEEDED", { plan: "FREE", limit: "1" });
 */
export class AppError extends Error {
  code: string;
  errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, details?: Record<string, string>) {
    const { code, message } = ERROR_CODES[errorCode];

    let finalMessage: string = message;
    if (details) {
      finalMessage = Object.entries(details).reduce(
        (msg, [key, value]) => msg.replace(`{${key}}`, value),
        message as string
      );
    }

    super(finalMessage);
    this.code = code;
    this.errorCode = errorCode;
    this.name = "AppError";
  }
}

/**
 * AppError 생성 헬퍼 함수
 */
export function appError(
  errorCode: ErrorCode,
  details?: Record<string, string>
): AppError {
  return new AppError(errorCode, details);
}

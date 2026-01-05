import { z } from "zod";
import { AppError } from "./errors";

/**
 * Zod 스키마를 TanStack Server Function의 inputValidator로 변환
 *
 * 핵심 원칙: Zod 에러 메시지는 사용자에게 절대 노출하지 않음
 * - 검증 실패 시 항상 AppError("VAL_REQUIRED_FIELDS") throw
 * - 사용자에게는 "필수 항목을 입력해주세요" 메시지만 표시
 */
export function zodValidator<T extends z.ZodTypeAny>(schema: T) {
  return (input: unknown): z.infer<T> => {
    const result = schema.safeParse(input);
    if (!result.success) {
      throw new AppError("VAL_REQUIRED_FIELDS");
    }
    return result.data;
  };
}

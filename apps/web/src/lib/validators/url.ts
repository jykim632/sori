import { AppError } from "@/lib/errors";

export function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new AppError("VAL_INVALID_URL");
  }
}

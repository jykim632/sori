export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some((allowed) => {
    if (allowed === "*" || allowed === origin) return true;

    if (allowed.startsWith("*.")) {
      const baseDomain = allowed.slice(2);
      try {
        const originUrl = new URL(origin);
        return (
          originUrl.hostname === baseDomain ||
          originUrl.hostname.endsWith("." + baseDomain)
        );
      } catch {
        return false;
      }
    }
    return false;
  });
}

// CORS 헤더 생성 (동적 Origin)
export function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  // Origin이 허용 목록에 있으면 해당 Origin 반환, 아니면 첫 번째 허용 Origin
  const allowedOrigin = origin && isOriginAllowed(origin, allowedOrigins)
    ? origin
    : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Project-Id",
    "Access-Control-Allow-Credentials": "true",
  };
}

// 프로젝트 조회 전 사용하는 기본 CORS (에러 응답용)
export const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Project-Id",
};

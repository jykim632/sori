/**
 * Determine whether an origin is permitted by a list of allowed origin patterns.
 *
 * @param origin - The origin to validate (e.g., "https://example.com")
 * @param allowedOrigins - List of allowed patterns: `"*"` allows all, exact origins match literally, and entries starting with `"*."` allow the specified base domain and its subdomains.
 * @returns `true` if `origin` matches any pattern in `allowedOrigins` or if `allowedOrigins` is empty, `false` otherwise.
 */
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

/**
 * Create CORS response headers using the request origin and the configured allowed origins.
 *
 * @param origin - The request's Origin header value, or `null` if not provided.
 * @param allowedOrigins - Ordered list of allowed origin patterns used to determine the `Access-Control-Allow-Origin` value.
 * @returns An object containing CORS headers:
 * - `Access-Control-Allow-Origin`: the selected origin or an empty string,
 * - `Access-Control-Allow-Methods`: `"POST, OPTIONS"`,
 * - `Access-Control-Allow-Headers`: `"Content-Type, X-Project-Id"`,
 * - `Access-Control-Allow-Credentials`: `"true"`.
 */
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
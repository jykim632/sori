import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";
import type { Session } from "./auth";

// Request 객체를 키로 사용하여 세션 캐싱
// WeakMap이라 Request가 GC되면 자동으로 정리됨
const sessionCache = new WeakMap<Request, Promise<Session | null>>();

/**
 * 현재 request 내에서 세션을 캐싱하여 반환
 * 같은 request 내에서 여러 번 호출해도 DB 조회는 1번만 발생
 */
export async function getCachedSession(): Promise<Session | null> {
  const request = getRequest();

  // 서버 컨텍스트 외부에서 호출된 경우 null 반환
  if (!request) {
    return null;
  }

  if (!sessionCache.has(request)) {
    const promise = auth.api.getSession({ headers: request.headers });
    sessionCache.set(request, promise);
  }

  return sessionCache.get(request)!;
}

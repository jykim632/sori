import { getRequest } from "@tanstack/react-start/server";
import { getUserRoleInOrganization } from "@sori/database";

// Request + userId + orgId 조합으로 role 캐싱
// WeakMap이라 Request가 GC되면 자동으로 정리됨
const roleCache = new WeakMap<Request, Map<string, Promise<string | null>>>();

/**
 * 현재 request 내에서 조직 role을 캐싱하여 반환
 * 같은 request 내에서 같은 userId+orgId 조합은 DB 조회 1번만 발생
 */
export async function getCachedRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const request = getRequest();

  // 서버 컨텍스트 외부에서 호출된 경우 직접 조회
  if (!request) {
    return getUserRoleInOrganization(userId, organizationId);
  }

  const cacheKey = `${userId}:${organizationId}`;

  if (!roleCache.has(request)) {
    roleCache.set(request, new Map());
  }

  const requestCache = roleCache.get(request)!;

  if (!requestCache.has(cacheKey)) {
    const promise = getUserRoleInOrganization(userId, organizationId);
    requestCache.set(cacheKey, promise);
  }

  return requestCache.get(cacheKey)!;
}

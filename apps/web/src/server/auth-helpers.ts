import { getCachedSession } from "@/lib/session-cache";
import { AppError } from "@/lib/errors";

// ============================================
// 권한 검증 헬퍼 (서버 사이드 전용)
// 이 파일은 클라이언트 라우트에서 직접 import되지 않아야 합니다.
// ============================================

/**
 * 세션에서 userId 추출 (인증 필수)
 * 클라이언트에서 userId를 전달받지 않고 세션에서 안전하게 추출
 * 같은 request 내에서는 캐싱된 세션 사용
 */
export async function getSessionUserId(): Promise<string> {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    throw new AppError("AUTH_UNAUTHORIZED");
  }

  return session.user.id;
}

/**
 * 조직 접근 권한 확인
 * 현재 세션 사용자가 해당 조직의 멤버인지 확인
 */
export async function requireOrgMembership(organizationId: string): Promise<{
  userId: string;
  role: string;
}> {
  const userId = await getSessionUserId();
  const { getUserRoleInOrganization } = await import("@sori/database");
  const role = await getUserRoleInOrganization(userId, organizationId);

  if (!role) {
    throw new AppError("AUTH_NOT_MEMBER");
  }

  return { userId, role };
}

/**
 * 조직 관리자 권한 확인 (OWNER 또는 ADMIN)
 */
export async function requireOrgAdmin(organizationId: string): Promise<{
  userId: string;
  role: string;
}> {
  const { userId, role } = await requireOrgMembership(organizationId);

  if (role !== "OWNER" && role !== "ADMIN") {
    throw new AppError("AUTH_ADMIN_REQUIRED");
  }

  return { userId, role };
}

/**
 * 프로젝트 접근 권한 확인
 * 프로젝트가 속한 조직의 멤버인지 확인
 */
export async function requireProjectAccess(projectId: string): Promise<{
  userId: string;
  role: string;
  organizationId: string;
}> {
  const { getProjectById } = await import("@sori/database");
  const project = await getProjectById(projectId);

  if (!project) {
    throw new AppError("RES_PROJECT_NOT_FOUND");
  }

  const { userId, role } = await requireOrgMembership(project.organizationId);
  return { userId, role, organizationId: project.organizationId };
}

/**
 * 프로젝트 관리자 권한 확인
 */
export async function requireProjectAdmin(projectId: string): Promise<{
  userId: string;
  role: string;
  organizationId: string;
}> {
  const { getProjectById } = await import("@sori/database");
  const project = await getProjectById(projectId);

  if (!project) {
    throw new AppError("RES_PROJECT_NOT_FOUND");
  }

  const { userId, role } = await requireOrgAdmin(project.organizationId);
  return { userId, role, organizationId: project.organizationId };
}

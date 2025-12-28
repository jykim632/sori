import { createServerFn } from "@tanstack/react-start";
import {
  getProjects as getProjectsQuery,
  getProjectById as getProjectByIdQuery,
  createProject as createProjectQuery,
  updateProject as updateProjectQuery,
  deleteProject as deleteProjectQuery,
  regenerateProjectApiKey as regenerateApiKeyQuery,
  revokeProjectApiKey as revokeApiKeyQuery,
} from "@sori/database";
import {
  requireOrgMembership,
  requireOrgAdmin,
  requireProjectAccess,
  requireProjectAdmin,
} from "./auth";

// ============================================
// 프로젝트 조회 (멤버십 필요)
// ============================================

export const getProjects = createServerFn({ method: "GET" })
  .inputValidator((d: { organizationId?: string }) => d)
  .handler(async ({ data }) => {
    if (!data?.organizationId) {
      return [];
    }
    // 조직 멤버십 확인
    await requireOrgMembership(data.organizationId);
    return await getProjectsQuery(data.organizationId);
  });

export const getProjectById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    // 프로젝트 접근 권한 확인
    await requireProjectAccess(data.id);
    return await getProjectByIdQuery(data.id);
  });

// ============================================
// 프로젝트 생성/수정/삭제 (관리자 필요)
// ============================================

export const createProject = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      name: string;
      organizationId: string;
      allowedOrigins?: string[];
    }) => d
  )
  .handler(async ({ data }) => {
    // 조직 관리자 권한 확인
    await requireOrgAdmin(data.organizationId);
    return await createProjectQuery({
      name: data.name,
      organizationId: data.organizationId,
      allowedOrigins: data.allowedOrigins || [],
    });
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id: string;
      name?: string;
      allowedOrigins?: string[];
      widgetConfig?: {
        preset: "default" | "minimal" | "rounded";
        styles?: Record<string, unknown>;
        position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
        greeting?: string;
        types?: ("BUG" | "INQUIRY" | "FEATURE")[];
        locale?: "ko" | "en";
        zIndex?: number;
      };
    }) => d
  )
  .handler(async ({ data }) => {
    // 프로젝트 관리자 권한 확인
    await requireProjectAdmin(data.id);
    return await updateProjectQuery({
      id: data.id,
      name: data.name,
      allowedOrigins: data.allowedOrigins,
      widgetConfig: data.widgetConfig,
    });
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    // 프로젝트 관리자 권한 확인
    await requireProjectAdmin(data.id);
    await deleteProjectQuery(data.id);
    return { success: true };
  });

// ============================================
// API Key 관련 서버 함수 (관리자 필요)
// ============================================

export const generateApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    // 프로젝트 관리자 권한 확인
    await requireProjectAdmin(data.projectId);
    const apiKey = await regenerateApiKeyQuery(data.projectId);
    return { apiKey };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    // 프로젝트 관리자 권한 확인
    await requireProjectAdmin(data.projectId);
    await revokeApiKeyQuery(data.projectId);
    return { success: true };
  });

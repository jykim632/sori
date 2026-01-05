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
} from "./auth-helpers";
import { zodValidator } from "@/lib/zod-validator";
import {
  GetProjectsInputSchema,
  GetProjectByIdInputSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  DeleteProjectInputSchema,
  GenerateApiKeyInputSchema,
  RevokeApiKeyInputSchema,
} from "@/lib/schemas/server-input";

// ============================================
// 프로젝트 조회 (멤버십 필요)
// ============================================

export const getProjects = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetProjectsInputSchema))
  .handler(async ({ data }) => {
    if (!data?.organizationId) {
      return [];
    }
    // 조직 멤버십 확인
    await requireOrgMembership(data.organizationId);
    return await getProjectsQuery(data.organizationId);
  });

export const getProjectById = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(GetProjectByIdInputSchema))
  .handler(async ({ data }) => {
    // 프로젝트 접근 권한 확인
    await requireProjectAccess(data.id);
    return await getProjectByIdQuery(data.id);
  });

// ============================================
// 프로젝트 생성/수정/삭제 (관리자 필요)
// ============================================

export const createProject = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(CreateProjectInputSchema))
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
  .inputValidator(zodValidator(UpdateProjectInputSchema))
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
  .inputValidator(zodValidator(DeleteProjectInputSchema))
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
  .inputValidator(zodValidator(GenerateApiKeyInputSchema))
  .handler(async ({ data }) => {
    // 프로젝트 관리자 권한 확인
    await requireProjectAdmin(data.projectId);
    const apiKey = await regenerateApiKeyQuery(data.projectId);
    return { apiKey };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(RevokeApiKeyInputSchema))
  .handler(async ({ data }) => {
    // 프로젝트 관리자 권한 확인
    await requireProjectAdmin(data.projectId);
    await revokeApiKeyQuery(data.projectId);
    return { success: true };
  });

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

export const getProjects = createServerFn({ method: "GET" })
  .inputValidator((d: { organizationId?: string }) => d)
  .handler(async ({ data }) => {
    if (!data?.organizationId) {
      return [];
    }
    return await getProjectsQuery(data.organizationId);
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      name: string;
      organizationId: string;
      allowedOrigins?: string[];
    }) => d
  )
  .handler(async ({ data }) => {
    return await createProjectQuery({
      name: data.name,
      organizationId: data.organizationId,
      allowedOrigins: data.allowedOrigins || [],
    });
  });

export const getProjectById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    return await getProjectByIdQuery(data.id);
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
    await deleteProjectQuery(data.id);
    return { success: true };
  });

// ============================================
// API Key 관련 서버 함수
// ============================================

export const generateApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = await regenerateApiKeyQuery(data.projectId);
    return { apiKey };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    await revokeApiKeyQuery(data.projectId);
    return { success: true };
  });

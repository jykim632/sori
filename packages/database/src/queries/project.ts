import { query, queryOne, queryReturning, generateId } from "../client.ts";
import type { Project, ProjectWithOrganization, Organization, Webhook } from "../types.ts";

export async function getProjects(
  organizationId: string
): Promise<ProjectWithOrganization[]> {
  const sql = `
    SELECT
      p.id, p.name, p.allowed_origins as "allowedOrigins",
      p.widget_config as "widgetConfig", p.organization_id as "organizationId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      json_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'apiKey', o.api_key,
        'webhookUrl', o.webhook_url,
        'kakaoChannelId', o.kakao_channel_id,
        'plan', o.plan,
        'locale', o.locale,
        'createdAt', o.created_at,
        'updatedAt', o.updated_at
      ) as organization
    FROM project p
    JOIN organization o ON p.organization_id = o.id
    WHERE p.organization_id = $1
  `;

  return query<ProjectWithOrganization>(sql, [organizationId]);
}

export async function getProjectById(id: string): Promise<ProjectWithOrganization | null> {
  const sql = `
    SELECT
      p.id, p.name, p.allowed_origins as "allowedOrigins",
      p.widget_config as "widgetConfig", p.organization_id as "organizationId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      json_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'apiKey', o.api_key,
        'webhookUrl', o.webhook_url,
        'kakaoChannelId', o.kakao_channel_id,
        'plan', o.plan,
        'locale', o.locale,
        'createdAt', o.created_at,
        'updatedAt', o.updated_at
      ) as organization
    FROM project p
    JOIN organization o ON p.organization_id = o.id
    WHERE p.id = $1
  `;

  return queryOne<ProjectWithOrganization>(sql, [id]);
}

// For feedback API: get project with organization and webhooks
export async function getProjectWithWebhooks(id: string): Promise<
  | (Project & {
      organization: Organization & { webhooks: Webhook[] };
    })
  | null
> {
  const sql = `
    SELECT
      p.id, p.name, p.allowed_origins as "allowedOrigins",
      p.widget_config as "widgetConfig", p.organization_id as "organizationId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      json_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'apiKey', o.api_key,
        'webhookUrl', o.webhook_url,
        'kakaoChannelId', o.kakao_channel_id,
        'plan', o.plan,
        'locale', o.locale,
        'createdAt', o.created_at,
        'updatedAt', o.updated_at,
        'webhooks', COALESCE(
          (SELECT json_agg(json_build_object(
            'id', w.id,
            'name', w.name,
            'url', w.url,
            'type', w.type,
            'enabled', w.enabled,
            'organizationId', w.organization_id,
            'createdAt', w.created_at,
            'updatedAt', w.updated_at
          ))
          FROM webhook w
          WHERE w.organization_id = o.id AND w.enabled = true
          ), '[]'::json
        )
      ) as organization
    FROM project p
    JOIN organization o ON p.organization_id = o.id
    WHERE p.id = $1
  `;

  return queryOne(sql, [id]);
}

interface CreateProjectInput {
  name: string;
  organizationId: string;
  allowedOrigins?: string[];
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { name, organizationId, allowedOrigins = [] } = input;
  const id = generateId();

  const sql = `
    INSERT INTO project (id, name, organization_id, allowed_origins, created_at, updated_at)
    VALUES ($1, $2, $3, $4, now(), now())
    RETURNING
      id, name, allowed_origins as "allowedOrigins",
      widget_config as "widgetConfig", organization_id as "organizationId",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Project>(sql, [id, name, organizationId, allowedOrigins]);
}

interface UpdateProjectInput {
  id: string;
  name?: string;
  allowedOrigins?: string[];
  widgetConfig?: Record<string, unknown> | null;
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  const { id, name, allowedOrigins, widgetConfig } = input;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (allowedOrigins !== undefined) {
    updates.push(`allowed_origins = $${paramIndex++}`);
    params.push(allowedOrigins);
  }
  if (widgetConfig !== undefined) {
    updates.push(`widget_config = $${paramIndex++}`);
    params.push(widgetConfig ? JSON.stringify(widgetConfig) : null);
  }

  updates.push(`updated_at = now()`);
  params.push(id);

  const sql = `
    UPDATE project
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING
      id, name, allowed_origins as "allowedOrigins",
      widget_config as "widgetConfig", organization_id as "organizationId",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Project>(sql, params);
}

export async function deleteProject(id: string): Promise<void> {
  await query("DELETE FROM project WHERE id = $1", [id]);
}

// ============================================
// API Key 관련 함수
// ============================================

// Secure API Key 생성
function generateSecureApiKey(): string {
  const prefix = "sk_live_";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + key;
}

// API 키로 프로젝트 조회
export async function getProjectByApiKey(apiKey: string): Promise<Project | null> {
  const sql = `
    SELECT
      id, name, allowed_origins as "allowedOrigins",
      widget_config as "widgetConfig", organization_id as "organizationId",
      api_key as "apiKey", api_key_created_at as "apiKeyCreatedAt",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM project
    WHERE api_key = $1
  `;
  return queryOne<Project>(sql, [apiKey]);
}

// API 키 생성/재발급
export async function regenerateProjectApiKey(projectId: string): Promise<string> {
  const apiKey = generateSecureApiKey();

  const sql = `
    UPDATE project
    SET api_key = $1, api_key_created_at = now(), updated_at = now()
    WHERE id = $2
    RETURNING api_key as "apiKey"
  `;
  const result = await queryReturning<{ apiKey: string }>(sql, [apiKey, projectId]);
  return result.apiKey;
}

// API 키 삭제 (비활성화)
export async function revokeProjectApiKey(projectId: string): Promise<void> {
  await query(
    "UPDATE project SET api_key = NULL, api_key_created_at = NULL, updated_at = now() WHERE id = $1",
    [projectId]
  );
}

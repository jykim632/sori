import { query, queryOne, queryReturning, generateId } from "../client.ts";
import type { Webhook, WebhookType, Organization, Project } from "../types.ts";

// Detect webhook type from URL
function detectWebhookType(url: string): WebhookType {
  if (url.includes("hooks.slack.com")) return "SLACK";
  if (url.includes("discord.com/api/webhooks")) return "DISCORD";
  if (url.includes("api.telegram.org")) return "TELEGRAM";
  return "CUSTOM";
}

export async function getWebhooks(organizationId: string): Promise<Webhook[]> {
  const sql = `
    SELECT
      id, name, url, type, enabled, organization_id as "organizationId",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM webhook
    WHERE organization_id = $1
    ORDER BY created_at ASC
  `;

  return query<Webhook>(sql, [organizationId]);
}

export async function getWebhookById(id: string): Promise<Webhook | null> {
  const sql = `
    SELECT
      id, name, url, type, enabled, organization_id as "organizationId",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM webhook
    WHERE id = $1
  `;

  return queryOne<Webhook>(sql, [id]);
}

// For testing: get webhook with organization and first project
export async function getWebhookWithOrganization(id: string): Promise<
  | (Webhook & {
      organization: Organization & { projects: Project[] };
    })
  | null
> {
  const sql = `
    SELECT
      w.id, w.name, w.url, w.type, w.enabled, w.organization_id as "organizationId",
      w.created_at as "createdAt", w.updated_at as "updatedAt",
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
        'projects', COALESCE(
          (SELECT json_agg(json_build_object(
            'id', p.id,
            'name', p.name,
            'allowedOrigins', p.allowed_origins,
            'widgetConfig', p.widget_config,
            'organizationId', p.organization_id,
            'createdAt', p.created_at,
            'updatedAt', p.updated_at
          ))
          FROM project p
          WHERE p.organization_id = o.id
          LIMIT 1
          ), '[]'::json
        )
      ) as organization
    FROM webhook w
    JOIN organization o ON w.organization_id = o.id
    WHERE w.id = $1
  `;

  return queryOne(sql, [id]);
}

interface CreateWebhookInput {
  name: string;
  url: string;
  organizationId: string;
}

export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  const { name, url, organizationId } = input;
  const id = generateId();
  const type = detectWebhookType(url);

  const sql = `
    INSERT INTO webhook (id, name, url, type, organization_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, now(), now())
    RETURNING
      id, name, url, type, enabled, organization_id as "organizationId",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Webhook>(sql, [id, name, url, type, organizationId]);
}

interface UpdateWebhookInput {
  id: string;
  name?: string;
  url?: string;
  enabled?: boolean;
}

export async function updateWebhook(input: UpdateWebhookInput): Promise<Webhook> {
  const { id, name, url, enabled } = input;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (url !== undefined) {
    updates.push(`url = $${paramIndex++}`);
    params.push(url);
    // Auto-detect type when URL changes
    const type = detectWebhookType(url);
    updates.push(`type = $${paramIndex++}`);
    params.push(type);
  }
  if (enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    params.push(enabled);
  }

  updates.push(`updated_at = now()`);
  params.push(id);

  const sql = `
    UPDATE webhook
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING
      id, name, url, type, enabled, organization_id as "organizationId",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Webhook>(sql, params);
}

export async function deleteWebhook(id: string): Promise<void> {
  await query("DELETE FROM webhook WHERE id = $1", [id]);
}

export async function getWebhookCount(organizationId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM webhook WHERE organization_id = $1",
    [organizationId]
  );
  return parseInt(result?.count ?? "0", 10);
}

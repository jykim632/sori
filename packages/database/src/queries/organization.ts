import { query, queryOne, queryReturning, generateId, pool } from "../client.ts";
import type {
  Organization,
  OrganizationMember,
  OrganizationWithProjects,
  MemberRole,
  User,
} from "../types.ts";

export async function getOrganizationBySlug(
  slug: string
): Promise<Organization | null> {
  const sql = `
    SELECT
      id, name, slug, api_key as "apiKey", webhook_url as "webhookUrl",
      kakao_channel_id as "kakaoChannelId", plan, locale,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM organization
    WHERE slug = $1
  `;

  return queryOne<Organization>(sql, [slug]);
}

interface CreateOrganizationInput {
  name: string;
  slug: string;
  userId: string;
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<Organization> {
  const { name, slug, userId } = input;
  const orgId = generateId();
  const memberId = generateId();

  // Use transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create organization
    const orgResult = await client.query(
      `
      INSERT INTO organization (id, name, slug, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      RETURNING
        id, name, slug, api_key as "apiKey", webhook_url as "webhookUrl",
        kakao_channel_id as "kakaoChannelId", plan, locale,
        created_at as "createdAt", updated_at as "updatedAt"
    `,
      [orgId, name, slug]
    );

    // Create owner membership
    await client.query(
      `
      INSERT INTO organization_member (id, role, user_id, organization_id, created_at, updated_at)
      VALUES ($1, 'OWNER', $2, $3, now(), now())
    `,
      [memberId, userId, orgId]
    );

    await client.query("COMMIT");
    return orgResult.rows[0] as Organization;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserOrganizations(
  userId: string
): Promise<(OrganizationMember & { organization: Organization })[]> {
  const sql = `
    SELECT
      m.id, m.role, m.user_id as "userId", m.organization_id as "organizationId",
      m.created_at as "createdAt", m.updated_at as "updatedAt",
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
    FROM organization_member m
    JOIN organization o ON m.organization_id = o.id
    WHERE m.user_id = $1
    ORDER BY m.created_at ASC
  `;

  return query(sql, [userId]);
}

export async function getUserOrganization(
  userId: string
): Promise<Organization | null> {
  const sql = `
    SELECT
      o.id, o.name, o.slug, o.api_key as "apiKey", o.webhook_url as "webhookUrl",
      o.kakao_channel_id as "kakaoChannelId", o.plan, o.locale,
      o.created_at as "createdAt", o.updated_at as "updatedAt"
    FROM organization o
    JOIN organization_member m ON o.id = m.organization_id
    WHERE m.user_id = $1
    ORDER BY m.created_at ASC
    LIMIT 1
  `;

  return queryOne<Organization>(sql, [userId]);
}

export async function getOrganizationWithProjects(
  id: string
): Promise<OrganizationWithProjects | null> {
  const sql = `
    SELECT
      o.id, o.name, o.slug, o.api_key as "apiKey", o.webhook_url as "webhookUrl",
      o.kakao_channel_id as "kakaoChannelId", o.plan, o.locale,
      o.created_at as "createdAt", o.updated_at as "updatedAt",
      COALESCE(
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
        ), '[]'::json
      ) as projects,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', m.id,
          'role', m.role,
          'userId', m.user_id,
          'organizationId', m.organization_id,
          'createdAt', m.created_at,
          'updatedAt', m.updated_at,
          'user', json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
          )
        ))
        FROM organization_member m
        JOIN "user" u ON m.user_id = u.id
        WHERE m.organization_id = o.id
        ), '[]'::json
      ) as members
    FROM organization o
    WHERE o.id = $1
  `;

  return queryOne<OrganizationWithProjects>(sql, [id]);
}

export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string
): Promise<MemberRole | null> {
  const sql = `
    SELECT role
    FROM organization_member
    WHERE user_id = $1 AND organization_id = $2
  `;

  const result = await queryOne<{ role: MemberRole }>(sql, [userId, organizationId]);
  return result?.role ?? null;
}

export async function updateOrganizationWebhook(
  organizationId: string,
  webhookUrl: string | null
): Promise<Organization> {
  const sql = `
    UPDATE organization
    SET webhook_url = $1, updated_at = now()
    WHERE id = $2
    RETURNING
      id, name, slug, api_key as "apiKey", webhook_url as "webhookUrl",
      kakao_channel_id as "kakaoChannelId", plan, locale,
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  return queryReturning<Organization>(sql, [webhookUrl, organizationId]);
}

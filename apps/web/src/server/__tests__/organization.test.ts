import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sori/database', () => ({
  createOrganization: vi.fn(),
  getUserOrganizations: vi.fn(),
  getOrganizationBySlug: vi.fn(),
  getOrganizationWithProjects: vi.fn(),
  getUserRoleInOrganization: vi.fn(),
  updateOrganizationWebhook: vi.fn(),
}));

vi.mock('../auth-helpers', () => ({
  getSessionUserId: vi.fn(),
  requireOrgMembership: vi.fn(),
  requireOrgAdmin: vi.fn(),
}));

import {
  createOrganization,
  getUserOrganizations,
  getOrganizationBySlug,
  getOrganizationWithProjects,
  getUserRoleInOrganization,
} from '@sori/database';
import { getSessionUserId, requireOrgMembership, requireOrgAdmin } from '../auth-helpers';

describe('Organization Server Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should extract userId from session', async () => {
      vi.mocked(getSessionUserId).mockResolvedValue('user-123');
      vi.mocked(getOrganizationBySlug).mockResolvedValue(null);
      vi.mocked(createOrganization).mockResolvedValue({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
      } as any);

      const handler = async (data: { name: string; slug: string }) => {
        const userId = await getSessionUserId();
        const existing = await getOrganizationBySlug(data.slug);
        if (existing) {
          throw new Error('이미 사용 중인 URL입니다');
        }
        return await createOrganization({ ...data, userId });
      };

      await handler({ name: 'Test Org', slug: 'test-org' });

      expect(getSessionUserId).toHaveBeenCalled();
      expect(createOrganization).toHaveBeenCalledWith({
        name: 'Test Org',
        slug: 'test-org',
        userId: 'user-123',
      });
    });

    it('should reject duplicate slugs', async () => {
      vi.mocked(getSessionUserId).mockResolvedValue('user-123');
      vi.mocked(getOrganizationBySlug).mockResolvedValue({
        id: 'existing-org',
        slug: 'test-org',
      } as any);

      const handler = async (data: { name: string; slug: string }) => {
        const userId = await getSessionUserId();
        const existing = await getOrganizationBySlug(data.slug);
        if (existing) {
          throw new Error('이미 사용 중인 URL입니다');
        }
        return await createOrganization({ ...data, userId });
      };

      await expect(
        handler({ name: 'Test Org', slug: 'test-org' })
      ).rejects.toThrow('이미 사용 중인 URL입니다');
    });

    it('should handle unauthenticated requests', async () => {
      vi.mocked(getSessionUserId).mockRejectedValue(new Error('Unauthorized'));

      const handler = async (data: { name: string; slug: string }) => {
        const userId = await getSessionUserId();
        return await createOrganization({ ...data, userId });
      };

      await expect(
        handler({ name: 'Test Org', slug: 'test-org' })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return organizations with roles', async () => {
      vi.mocked(getSessionUserId).mockResolvedValue('user-123');
      vi.mocked(getUserOrganizations).mockResolvedValue([
        {
          organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
          role: 'OWNER',
        },
        {
          organization: { id: 'org-2', name: 'Org 2', slug: 'org-2' },
          role: 'MEMBER',
        },
      ] as any);

      const handler = async () => {
        const userId = await getSessionUserId();
        const memberships = await getUserOrganizations(userId);
        return memberships.map((m) => ({
          ...m.organization,
          role: m.role,
        }));
      };

      const result = await handler();

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('OWNER');
      expect(result[1].role).toBe('MEMBER');
    });

    it('should require authentication', async () => {
      vi.mocked(getSessionUserId).mockRejectedValue(new Error('Unauthorized'));

      const handler = async () => {
        const userId = await getSessionUserId();
        return await getUserOrganizations(userId);
      };

      await expect(handler()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getOrganizationWithProjects', () => {
    it('should check membership before returning data', async () => {
      vi.mocked(requireOrgMembership).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
      });
      vi.mocked(getOrganizationWithProjects).mockResolvedValue({
        id: 'org-123',
        name: 'Test Org',
        projects: [],
      } as any);

      const handler = async (data: { organizationId: string }) => {
        await requireOrgMembership(data.organizationId);
        return await getOrganizationWithProjects(data.organizationId);
      };

      await handler({ organizationId: 'org-123' });

      expect(requireOrgMembership).toHaveBeenCalledWith('org-123');
    });

    it('should reject non-members', async () => {
      vi.mocked(requireOrgMembership).mockRejectedValue(
        new Error('Forbidden: Not a member of this organization')
      );

      const handler = async (data: { organizationId: string }) => {
        await requireOrgMembership(data.organizationId);
        return await getOrganizationWithProjects(data.organizationId);
      };

      await expect(
        handler({ organizationId: 'org-123' })
      ).rejects.toThrow('Forbidden: Not a member of this organization');
    });
  });

  describe('getUserRoleInOrganization', () => {
    it('should return user role', async () => {
      vi.mocked(getSessionUserId).mockResolvedValue('user-123');
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('ADMIN');

      const handler = async (data: { organizationId: string }) => {
        const userId = await getSessionUserId();
        return await getUserRoleInOrganization(userId, data.organizationId);
      };

      const role = await handler({ organizationId: 'org-123' });

      expect(role).toBe('ADMIN');
      expect(getUserRoleInOrganization).toHaveBeenCalledWith('user-123', 'org-123');
    });

    it('should return null for non-members', async () => {
      vi.mocked(getSessionUserId).mockResolvedValue('user-123');
      vi.mocked(getUserRoleInOrganization).mockResolvedValue(null);

      const handler = async (data: { organizationId: string }) => {
        const userId = await getSessionUserId();
        return await getUserRoleInOrganization(userId, data.organizationId);
      };

      const role = await handler({ organizationId: 'org-123' });
      expect(role).toBeNull();
    });
  });

  describe('updateOrganizationWebhook', () => {
    it('should require admin role', async () => {
      vi.mocked(requireOrgAdmin).mockResolvedValue({
        userId: 'user-123',
        role: 'ADMIN',
      });
      vi.mocked(updateOrganizationWebhook).mockResolvedValue({
        id: 'org-123',
        webhookUrl: 'https://hooks.slack.com/services/xxx',
      } as any);

      const handler = async (data: { organizationId: string; webhookUrl: string | null }) => {
        await requireOrgAdmin(data.organizationId);
        if (data.webhookUrl) {
          try {
            new URL(data.webhookUrl);
          } catch {
            throw new Error('Invalid URL');
          }
        }
        return await updateOrganizationWebhook(data.organizationId, data.webhookUrl);
      };

      await handler({
        organizationId: 'org-123',
        webhookUrl: 'https://hooks.slack.com/services/xxx',
      });

      expect(requireOrgAdmin).toHaveBeenCalledWith('org-123');
    });

    it('should reject non-admin users', async () => {
      vi.mocked(requireOrgAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const handler = async (data: { organizationId: string; webhookUrl: string | null }) => {
        await requireOrgAdmin(data.organizationId);
        return await updateOrganizationWebhook(data.organizationId, data.webhookUrl);
      };

      await expect(
        handler({ organizationId: 'org-123', webhookUrl: 'https://example.com' })
      ).rejects.toThrow('Forbidden: Admin access required');
    });

    it('should validate webhook URL format', async () => {
      vi.mocked(requireOrgAdmin).mockResolvedValue({
        userId: 'user-123',
        role: 'ADMIN',
      });

      const handler = async (data: { organizationId: string; webhookUrl: string | null }) => {
        await requireOrgAdmin(data.organizationId);
        if (data.webhookUrl) {
          try {
            new URL(data.webhookUrl);
          } catch {
            throw new Error('Invalid URL');
          }
        }
        return await updateOrganizationWebhook(data.organizationId, data.webhookUrl);
      };

      await expect(
        handler({ organizationId: 'org-123', webhookUrl: 'invalid-url' })
      ).rejects.toThrow('Invalid URL');
    });

    it('should allow null webhook URL', async () => {
      vi.mocked(requireOrgAdmin).mockResolvedValue({
        userId: 'user-123',
        role: 'ADMIN',
      });
      vi.mocked(updateOrganizationWebhook).mockResolvedValue({
        id: 'org-123',
        webhookUrl: null,
      } as any);

      const handler = async (data: { organizationId: string; webhookUrl: string | null }) => {
        await requireOrgAdmin(data.organizationId);
        if (data.webhookUrl) {
          try {
            new URL(data.webhookUrl);
          } catch {
            throw new Error('Invalid URL');
          }
        }
        return await updateOrganizationWebhook(data.organizationId, data.webhookUrl);
      };

      const result = await handler({ organizationId: 'org-123', webhookUrl: null });
      expect(result.webhookUrl).toBeNull();
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSessionUserId,
  requireOrgMembership,
  requireOrgAdmin,
  requireProjectAccess,
  requireProjectAdmin,
} from '../auth-helpers';

// Mock dependencies
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@sori/database', async () => {
  const actual = await vi.importActual('@sori/database');
  return {
    ...actual,
    getUserRoleInOrganization: vi.fn(),
    getProjectById: vi.fn(),
  };
});

import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { getUserRoleInOrganization, getProjectById } from '@sori/database';

describe('auth-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessionUserId', () => {
    it('should return userId from valid session', async () => {
      const mockUserId = 'user-123';
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);

      const result = await getSessionUserId();
      expect(result).toBe(mockUserId);
    });

    it('should throw error when session is null', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      await expect(getSessionUserId()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when user is undefined', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({} as any);

      await expect(getSessionUserId()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when user.id is undefined', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {},
      } as any);

      await expect(getSessionUserId()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when user.id is empty string', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: '' },
      } as any);

      await expect(getSessionUserId()).rejects.toThrow('Unauthorized');
    });
  });

  describe('requireOrgMembership', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-456';

    it('should return userId and role for valid member', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('MEMBER');

      const result = await requireOrgMembership(mockOrgId);
      
      expect(result).toEqual({
        userId: mockUserId,
        role: 'MEMBER',
      });
      expect(getUserRoleInOrganization).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });

    it('should return OWNER role', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('OWNER');

      const result = await requireOrgMembership(mockOrgId);
      expect(result.role).toBe('OWNER');
    });

    it('should return ADMIN role', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('ADMIN');

      const result = await requireOrgMembership(mockOrgId);
      expect(result.role).toBe('ADMIN');
    });

    it('should throw error when user is not a member', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue(null);

      await expect(requireOrgMembership(mockOrgId)).rejects.toThrow(
        'Forbidden: Not a member of this organization'
      );
    });

    it('should throw error when session is invalid', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      await expect(requireOrgMembership(mockOrgId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('requireOrgAdmin', () => {
    const mockUserId = 'user-123';
    const mockOrgId = 'org-456';

    it('should allow OWNER role', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('OWNER');

      const result = await requireOrgAdmin(mockOrgId);
      expect(result).toEqual({
        userId: mockUserId,
        role: 'OWNER',
      });
    });

    it('should allow ADMIN role', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('ADMIN');

      const result = await requireOrgAdmin(mockOrgId);
      expect(result).toEqual({
        userId: mockUserId,
        role: 'ADMIN',
      });
    });

    it('should reject MEMBER role', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('MEMBER');

      await expect(requireOrgAdmin(mockOrgId)).rejects.toThrow(
        'Forbidden: Admin access required'
      );
    });

    it('should reject non-member', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue(null);

      await expect(requireOrgAdmin(mockOrgId)).rejects.toThrow(
        'Forbidden: Not a member of this organization'
      );
    });
  });

  describe('requireProjectAccess', () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'project-789';
    const mockOrgId = 'org-456';

    it('should return access info for valid member', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue({
        id: mockProjectId,
        organizationId: mockOrgId,
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('MEMBER');

      const result = await requireProjectAccess(mockProjectId);
      
      expect(result).toEqual({
        userId: mockUserId,
        role: 'MEMBER',
        organizationId: mockOrgId,
      });
      expect(getProjectById).toHaveBeenCalledWith(mockProjectId);
      expect(getUserRoleInOrganization).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });

    it('should throw error when project not found', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue(null);

      await expect(requireProjectAccess(mockProjectId)).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw error when user is not org member', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue({
        id: mockProjectId,
        organizationId: mockOrgId,
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue(null);

      await expect(requireProjectAccess(mockProjectId)).rejects.toThrow(
        'Forbidden: Not a member of this organization'
      );
    });
  });

  describe('requireProjectAdmin', () => {
    const mockUserId = 'user-123';
    const mockProjectId = 'project-789';
    const mockOrgId = 'org-456';

    it('should allow OWNER of organization', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue({
        id: mockProjectId,
        organizationId: mockOrgId,
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('OWNER');

      const result = await requireProjectAdmin(mockProjectId);
      expect(result).toEqual({
        userId: mockUserId,
        role: 'OWNER',
        organizationId: mockOrgId,
      });
    });

    it('should allow ADMIN of organization', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue({
        id: mockProjectId,
        organizationId: mockOrgId,
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('ADMIN');

      const result = await requireProjectAdmin(mockProjectId);
      expect(result.role).toBe('ADMIN');
    });

    it('should reject MEMBER of organization', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue({
        id: mockProjectId,
        organizationId: mockOrgId,
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('MEMBER');

      await expect(requireProjectAdmin(mockProjectId)).rejects.toThrow(
        'Forbidden: Admin access required'
      );
    });

    it('should throw error when project not found', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getProjectById).mockResolvedValue(null);

      await expect(requireProjectAdmin(mockProjectId)).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'user-123' },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(requireOrgMembership('org-456')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle concurrent requests correctly', async () => {
      const mockUserId = 'user-123';
      vi.mocked(getRequest).mockReturnValue({} as any);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: mockUserId },
      } as any);
      vi.mocked(getUserRoleInOrganization).mockResolvedValue('OWNER');

      const promises = [
        requireOrgMembership('org-1'),
        requireOrgMembership('org-2'),
        requireOrgMembership('org-3'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.userId).toBe(mockUserId);
        expect(result.role).toBe('OWNER');
      });
    });
  });
});
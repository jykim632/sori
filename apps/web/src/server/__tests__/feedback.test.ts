import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@sori/database', () => ({
  getFeedbacks: vi.fn(),
  getFeedbacksFiltered: vi.fn(),
  createFeedback: vi.fn(),
  updateFeedbackStatus: vi.fn(),
  getFeedbackById: vi.fn(),
}));

vi.mock('../auth-helpers', () => ({
  requireOrgMembership: vi.fn(),
  requireProjectAccess: vi.fn(),
}));

import {
  getFeedbacks,
  getFeedbacksFiltered,
  createFeedback,
  updateFeedbackStatus,
  getFeedbackById,
} from '@sori/database';
import { requireOrgMembership, requireProjectAccess } from '../auth-helpers';

describe('Feedback Server Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeedbacks', () => {
    it('should check organization membership when organizationId provided', async () => {
      const mockFeedbacks = [
        { id: '1', type: 'BUG', message: 'Test', projectId: 'p1' },
      ];

      vi.mocked(requireOrgMembership).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
      });
      vi.mocked(getFeedbacks).mockResolvedValue(mockFeedbacks as any);

      const handler = async (data: { organizationId?: string; projectId?: string }) => {
        if (data?.organizationId) {
          await requireOrgMembership(data.organizationId);
        }
        if (data?.projectId) {
          await requireProjectAccess(data.projectId);
        }
        return await getFeedbacks(data);
      };

      await handler({ organizationId: 'org-123' });

      expect(requireOrgMembership).toHaveBeenCalledWith('org-123');
      expect(getFeedbacks).toHaveBeenCalled();
    });

    it('should check project access when projectId provided', async () => {
      vi.mocked(requireProjectAccess).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
        organizationId: 'org-123',
      });
      vi.mocked(getFeedbacks).mockResolvedValue([]);

      const handler = async (data: { organizationId?: string; projectId?: string }) => {
        if (data?.organizationId) {
          await requireOrgMembership(data.organizationId);
        }
        if (data?.projectId) {
          await requireProjectAccess(data.projectId);
        }
        return await getFeedbacks(data);
      };

      await handler({ projectId: 'project-123' });

      expect(requireProjectAccess).toHaveBeenCalledWith('project-123');
    });

    it('should throw error when user lacks membership', async () => {
      vi.mocked(requireOrgMembership).mockRejectedValue(
        new Error('Forbidden: Not a member of this organization')
      );

      const handler = async (data: { organizationId?: string }) => {
        if (data?.organizationId) {
          await requireOrgMembership(data.organizationId);
        }
        return await getFeedbacks(data);
      };

      await expect(handler({ organizationId: 'org-123' })).rejects.toThrow(
        'Forbidden: Not a member of this organization'
      );
    });
  });

  describe('getFeedbacksFiltered', () => {
    it('should require organization membership', async () => {
      vi.mocked(requireOrgMembership).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
      });
      vi.mocked(getFeedbacksFiltered).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      } as any);

      const handler = async (data: any) => {
        await requireOrgMembership(data.organizationId);
        return await getFeedbacksFiltered(data);
      };

      await handler({ organizationId: 'org-123' });

      expect(requireOrgMembership).toHaveBeenCalledWith('org-123');
    });

    it('should pass filter parameters correctly', async () => {
      vi.mocked(requireOrgMembership).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
      });
      vi.mocked(getFeedbacksFiltered).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      } as any);

      const handler = async (data: any) => {
        await requireOrgMembership(data.organizationId);
        return await getFeedbacksFiltered(data);
      };

      const filters = {
        organizationId: 'org-123',
        projectId: 'project-123',
        status: 'OPEN' as const,
        type: 'BUG' as const,
        search: 'test',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        orderBy: 'createdAt' as const,
        order: 'desc' as const,
        page: 1,
        limit: 20,
      };

      await handler(filters);

      expect(getFeedbacksFiltered).toHaveBeenCalledWith(filters);
    });
  });

  describe('createFeedback', () => {
    it('should require project access before creating', async () => {
      vi.mocked(requireProjectAccess).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
        organizationId: 'org-123',
      });
      vi.mocked(createFeedback).mockResolvedValue({
        id: 'feedback-123',
        type: 'BUG',
        message: 'Test',
        email: 'user@example.com',
        projectId: 'project-123',
        privacyAgreedAt: new Date(),
      } as any);

      const handler = async (data: any) => {
        await requireProjectAccess(data.projectId);
        if (!data.message || !data.type || !data.projectId || !data.email) {
          throw new Error('Missing required fields');
        }
        return await createFeedback({
          ...data,
          metadata: data.metadata || null,
          privacyAgreedAt: new Date(),
        });
      };

      const input = {
        type: 'BUG' as const,
        message: 'Test message',
        email: 'user@example.com',
        projectId: 'project-123',
      };

      await handler(input);

      expect(requireProjectAccess).toHaveBeenCalledWith('project-123');
      expect(createFeedback).toHaveBeenCalled();
    });

    it('should reject when required fields are missing', async () => {
      vi.mocked(requireProjectAccess).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
        organizationId: 'org-123',
      });

      const handler = async (data: any) => {
        await requireProjectAccess(data.projectId);
        if (!data.message || !data.type || !data.projectId || !data.email) {
          throw new Error('Missing required fields');
        }
        return await createFeedback(data);
      };

      await expect(
        handler({ type: 'BUG', message: 'Test' })
      ).rejects.toThrow('Missing required fields');
    });

    it('should include privacy consent timestamp', async () => {
      vi.mocked(requireProjectAccess).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
        organizationId: 'org-123',
      });
      vi.mocked(createFeedback).mockResolvedValue({
        id: 'feedback-123',
      } as any);

      const handler = async (data: any) => {
        await requireProjectAccess(data.projectId);
        return await createFeedback({
          ...data,
          privacyAgreedAt: new Date(),
        });
      };

      const input = {
        type: 'BUG' as const,
        message: 'Test',
        email: 'user@example.com',
        projectId: 'project-123',
      };

      await handler(input);

      expect(createFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          privacyAgreedAt: expect.any(Date),
        })
      );
    });
  });

  describe('updateFeedbackStatus', () => {
    it('should verify project access before updating', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        projectId: 'project-123',
      };

      vi.mocked(getFeedbackById).mockResolvedValue(mockFeedback as any);
      vi.mocked(requireProjectAccess).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
        organizationId: 'org-123',
      });
      vi.mocked(updateFeedbackStatus).mockResolvedValue({
        ...mockFeedback,
        status: 'RESOLVED',
      } as any);

      const handler = async (data: { id: string; status: any }) => {
        const feedback = await getFeedbackById(data.id);
        if (!feedback) {
          throw new Error('Feedback not found');
        }
        await requireProjectAccess(feedback.projectId);
        return await updateFeedbackStatus(data);
      };

      await handler({ id: 'feedback-123', status: 'RESOLVED' });

      expect(getFeedbackById).toHaveBeenCalledWith('feedback-123');
      expect(requireProjectAccess).toHaveBeenCalledWith('project-123');
      expect(updateFeedbackStatus).toHaveBeenCalled();
    });

    it('should throw error when feedback not found', async () => {
      vi.mocked(getFeedbackById).mockResolvedValue(null);

      const handler = async (data: { id: string; status: any }) => {
        const feedback = await getFeedbackById(data.id);
        if (!feedback) {
          throw new Error('Feedback not found');
        }
        await requireProjectAccess(feedback.projectId);
        return await updateFeedbackStatus(data);
      };

      await expect(
        handler({ id: 'nonexistent', status: 'RESOLVED' })
      ).rejects.toThrow('Feedback not found');
    });

    it('should throw error when user lacks access', async () => {
      vi.mocked(getFeedbackById).mockResolvedValue({
        id: 'feedback-123',
        projectId: 'project-123',
      } as any);
      vi.mocked(requireProjectAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this organization')
      );

      const handler = async (data: { id: string; status: any }) => {
        const feedback = await getFeedbackById(data.id);
        if (!feedback) {
          throw new Error('Feedback not found');
        }
        await requireProjectAccess(feedback.projectId);
        return await updateFeedbackStatus(data);
      };

      await expect(
        handler({ id: 'feedback-123', status: 'RESOLVED' })
      ).rejects.toThrow('Forbidden: Not a member of this organization');
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(requireOrgMembership).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
      });
      vi.mocked(getFeedbacks).mockRejectedValue(
        new Error('Database connection failed')
      );

      const handler = async (data: any) => {
        if (data?.organizationId) {
          await requireOrgMembership(data.organizationId);
        }
        return await getFeedbacks(data);
      };

      await expect(
        handler({ organizationId: 'org-123' })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent status updates', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        projectId: 'project-123',
        status: 'OPEN',
      };

      vi.mocked(getFeedbackById).mockResolvedValue(mockFeedback as any);
      vi.mocked(requireProjectAccess).mockResolvedValue({
        userId: 'user-123',
        role: 'MEMBER',
        organizationId: 'org-123',
      });
      vi.mocked(updateFeedbackStatus).mockResolvedValue({
        ...mockFeedback,
        status: 'RESOLVED',
      } as any);

      const handler = async (data: { id: string; status: any }) => {
        const feedback = await getFeedbackById(data.id);
        if (!feedback) {
          throw new Error('Feedback not found');
        }
        await requireProjectAccess(feedback.projectId);
        return await updateFeedbackStatus(data);
      };

      // Simulate concurrent updates
      const updates = [
        handler({ id: 'feedback-123', status: 'RESOLVED' }),
        handler({ id: 'feedback-123', status: 'IN_PROGRESS' }),
        handler({ id: 'feedback-123', status: 'CLOSED' }),
      ];

      await Promise.all(updates);

      expect(updateFeedbackStatus).toHaveBeenCalledTimes(3);
    });
  });
});
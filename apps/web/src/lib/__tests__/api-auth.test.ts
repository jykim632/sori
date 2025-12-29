import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateApiKey, apiError, apiSuccess } from '../api-auth';

// Mock database
vi.mock('@sori/database', () => ({
  getProjectByApiKey: vi.fn(),
}));

import { getProjectByApiKey } from '@sori/database';

describe('api-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateApiKey', () => {
    describe('Valid Authentication', () => {
      it('should authenticate valid API key', async () => {
        const mockProject = {
          id: 'project-123',
          name: 'Test Project',
          apiKey: 'sk_live_validkey123',
        };

        vi.mocked(getProjectByApiKey).mockResolvedValue(mockProject as any);

        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer sk_live_validkey123',
          },
        });

        const result = await authenticateApiKey(request);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.project).toEqual(mockProject);
        }
      });

      it('should trim whitespace from API key', async () => {
        const mockProject = { id: 'project-123', apiKey: 'sk_live_validkey123' };
        vi.mocked(getProjectByApiKey).mockResolvedValue(mockProject as any);

        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer  sk_live_validkey123  ',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(true);
      });
    });

    describe('Missing Authorization Header', () => {
      it('should reject request without Authorization header', async () => {
        const request = new Request('https://api.example.com');
        const result = await authenticateApiKey(request);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Missing Authorization header');
          expect(result.status).toBe(401);
        }
      });
    });

    describe('Invalid Authorization Format', () => {
      it('should reject non-Bearer authorization', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Basic username:password',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Invalid Authorization format');
          expect(result.status).toBe(401);
        }
      });

      it('should reject Bearer token without space', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearersk_live_key',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
      });

      it('should reject empty Bearer token', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer ',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('API key is empty');
        }
      });

      it('should reject Bearer token with only whitespace', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer    ',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
      });
    });

    describe('Invalid API Key Format', () => {
      it('should reject API key without sk_live_ prefix', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer invalid_key_format',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Invalid API key format');
          expect(result.status).toBe(401);
        }
      });

      it('should reject test API key (sk_test_)', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer sk_test_testkey123',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
      });

      it('should reject random string', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer randomstring',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
      });
    });

    describe('Database Errors', () => {
      it('should handle project not found', async () => {
        vi.mocked(getProjectByApiKey).mockResolvedValue(null);

        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer sk_live_nonexistent',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Invalid API key');
          expect(result.status).toBe(401);
        }
      });

      it('should handle database errors', async () => {
        vi.mocked(getProjectByApiKey).mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer sk_live_validkey123',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Authentication failed');
          expect(result.status).toBe(500);
        }
      });

      it('should handle timeout errors', async () => {
        vi.mocked(getProjectByApiKey).mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        );

        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer sk_live_validkey123',
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long API keys', async () => {
        const longKey = 'sk_live_' + 'a'.repeat(1000);
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: `Bearer ${longKey}`,
          },
        });

        vi.mocked(getProjectByApiKey).mockResolvedValue(null);
        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false);
      });

      it('should handle special characters in API key', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'Bearer sk_live_key!@#$%',
          },
        });

        vi.mocked(getProjectByApiKey).mockResolvedValue({
          id: 'project-123',
          apiKey: 'sk_live_key!@#$%',
        } as any);

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(true);
      });

      it('should handle case sensitivity', async () => {
        const request = new Request('https://api.example.com', {
          headers: {
            Authorization: 'bearer sk_live_key123', // lowercase 'bearer'
          },
        });

        const result = await authenticateApiKey(request);
        expect(result.success).toBe(false); // Should be case-sensitive
      });
    });
  });

  describe('Helper Functions', () => {
    describe('apiError', () => {
      it('should create error response with default status', () => {
        const response = apiError('Test error');
        expect(response.status).toBe(400);
      });

      it('should create error response with custom status', () => {
        const response = apiError('Not found', 404);
        expect(response.status).toBe(404);
      });

      it('should include CORS headers', async () => {
        const response = apiError('Test error');
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      });

      it('should have correct content type', () => {
        const response = apiError('Test error');
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });

      it('should include error message in body', async () => {
        const response = apiError('Custom error');
        const body = await response.json();
        expect(body.error).toBe('Custom error');
      });
    });

    describe('apiSuccess', () => {
      it('should create success response with data', () => {
        const data = { id: '123', name: 'Test' };
        const response = apiSuccess(data);
        expect(response.status).toBe(200);
      });

      it('should include CORS headers', () => {
        const response = apiSuccess({ test: true });
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      });

      it('should have correct content type', () => {
        const response = apiSuccess({ test: true });
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });

      it('should serialize data correctly', async () => {
        const data = { id: '123', active: true, count: 42 };
        const response = apiSuccess(data);
        const body = await response.json();
        expect(body).toEqual(data);
      });
    });
  });
});
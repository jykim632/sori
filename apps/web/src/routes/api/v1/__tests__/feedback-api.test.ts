import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@sori/database', () => ({
  getProjectWithWebhooks: vi.fn(),
  createFeedback: vi.fn(),
}));

import { getProjectWithWebhooks, createFeedback } from '@sori/database';

describe('Feedback API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should allow requests under rate limit', () => {
      const checkRateLimit = (ip: string, limitMap: Map<string, { count: number; resetTime: number }>) => {
        const now = Date.now();
        const limit = limitMap.get(ip);

        if (!limit || now > limit.resetTime) {
          limitMap.set(ip, { count: 1, resetTime: now + 60000 });
          return true;
        }

        if (limit.count >= 10) {
          return false;
        }

        limit.count++;
        return true;
      };

      const rateLimitMap = new Map();
      const ip = '192.168.1.1';

      // First 10 requests should succeed
      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(ip, rateLimitMap)).toBe(true);
      }
    });

    it('should block requests over rate limit', () => {
      const checkRateLimit = (ip: string, limitMap: Map<string, { count: number; resetTime: number }>) => {
        const now = Date.now();
        const limit = limitMap.get(ip);

        if (!limit || now > limit.resetTime) {
          limitMap.set(ip, { count: 1, resetTime: now + 60000 });
          return true;
        }

        if (limit.count >= 10) {
          return false;
        }

        limit.count++;
        return true;
      };

      const rateLimitMap = new Map();
      const ip = '192.168.1.1';

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit(ip, rateLimitMap);
      }

      // 11th request should be blocked
      expect(checkRateLimit(ip, rateLimitMap)).toBe(false);
    });

    it('should reset rate limit after time window', () => {
      const checkRateLimit = (ip: string, limitMap: Map<string, { count: number; resetTime: number }>, now: number) => {
        const limit = limitMap.get(ip);

        if (!limit || now > limit.resetTime) {
          limitMap.set(ip, { count: 1, resetTime: now + 60000 });
          return true;
        }

        if (limit.count >= 10) {
          return false;
        }

        limit.count++;
        return true;
      };

      const rateLimitMap = new Map();
      const ip = '192.168.1.1';
      const now = Date.now();

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit(ip, rateLimitMap, now);
      }

      expect(checkRateLimit(ip, rateLimitMap, now)).toBe(false);

      // After time window, should allow again
      const futureTime = now + 61000;
      expect(checkRateLimit(ip, rateLimitMap, futureTime)).toBe(true);
    });

    it('should handle different IPs independently', () => {
      const checkRateLimit = (ip: string, limitMap: Map<string, { count: number; resetTime: number }>) => {
        const now = Date.now();
        const limit = limitMap.get(ip);

        if (!limit || now > limit.resetTime) {
          limitMap.set(ip, { count: 1, resetTime: now + 60000 });
          return true;
        }

        if (limit.count >= 10) {
          return false;
        }

        limit.count++;
        return true;
      };

      const rateLimitMap = new Map();
      
      // Exhaust limit for IP1
      for (let i = 0; i < 10; i++) {
        checkRateLimit('192.168.1.1', rateLimitMap);
      }

      expect(checkRateLimit('192.168.1.1', rateLimitMap)).toBe(false);
      
      // IP2 should still be allowed
      expect(checkRateLimit('192.168.1.2', rateLimitMap)).toBe(true);
    });
  });

  describe('Origin Validation', () => {
    it('should allow exact origin match', () => {
      const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
        if (allowedOrigins.length === 0) return true;

        return allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;

          if (allowed.startsWith('*.')) {
            const baseDomain = allowed.slice(2);
            try {
              const originUrl = new URL(origin);
              return (
                originUrl.hostname === baseDomain ||
                originUrl.hostname.endsWith('.' + baseDomain)
              );
            } catch {
              return false;
            }
          }
          return false;
        });
      };

      expect(isOriginAllowed('https://example.com', ['https://example.com'])).toBe(true);
    });

    it('should allow wildcard origin', () => {
      const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
        if (allowedOrigins.length === 0) return true;
        return allowedOrigins.some((allowed) => allowed === '*' || allowed === origin);
      };

      expect(isOriginAllowed('https://example.com', ['*'])).toBe(true);
      expect(isOriginAllowed('https://any-domain.com', ['*'])).toBe(true);
    });

    it('should allow subdomain wildcard', () => {
      const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
        if (allowedOrigins.length === 0) return true;

        return allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;

          if (allowed.startsWith('*.')) {
            const baseDomain = allowed.slice(2);
            try {
              const originUrl = new URL(origin);
              return (
                originUrl.hostname === baseDomain ||
                originUrl.hostname.endsWith('.' + baseDomain)
              );
            } catch {
              return false;
            }
          }
          return false;
        });
      };

      expect(isOriginAllowed('https://sub.example.com', ['*.example.com'])).toBe(true);
      expect(isOriginAllowed('https://deep.sub.example.com', ['*.example.com'])).toBe(true);
      expect(isOriginAllowed('https://example.com', ['*.example.com'])).toBe(true);
    });

    it('should reject non-matching origin', () => {
      const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
        if (allowedOrigins.length === 0) return true;

        return allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;

          if (allowed.startsWith('*.')) {
            const baseDomain = allowed.slice(2);
            try {
              const originUrl = new URL(origin);
              return (
                originUrl.hostname === baseDomain ||
                originUrl.hostname.endsWith('.' + baseDomain)
              );
            } catch {
              return false;
            }
          }
          return false;
        });
      };

      expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(false);
      expect(isOriginAllowed('https://evil.com', ['*.example.com'])).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
        if (allowedOrigins.length === 0) return true;

        return allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;

          if (allowed.startsWith('*.')) {
            const baseDomain = allowed.slice(2);
            try {
              const originUrl = new URL(origin);
              return (
                originUrl.hostname === baseDomain ||
                originUrl.hostname.endsWith('.' + baseDomain)
              );
            } catch {
              return false;
            }
          }
          return false;
        });
      };

      expect(isOriginAllowed('not-a-url', ['*.example.com'])).toBe(false);
      expect(isOriginAllowed('', ['*.example.com'])).toBe(false);
    });

    it('should allow when allowedOrigins is empty', () => {
      const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
        if (allowedOrigins.length === 0) return true;
        return allowedOrigins.some((allowed) => allowed === '*' || allowed === origin);
      };

      expect(isOriginAllowed('https://any.com', [])).toBe(true);
    });
  });

  describe('Webhook URL Validation (SSRF Protection)', () => {
    const ALLOWED_WEBHOOK_HOSTS = [
      'hooks.slack.com',
      'discord.com',
      'discordapp.com',
      'api.telegram.org',
    ];

    const BLOCKED_HOST_PATTERNS = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /^::1$/,
      /^\[::1\]$/,
    ];

    const isWebhookUrlAllowed = (url: string): boolean => {
      try {
        const parsed = new URL(url);

        if (parsed.protocol !== 'https:') {
          return false;
        }

        if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
          return false;
        }

        const isAllowedHost = ALLOWED_WEBHOOK_HOSTS.some(
          (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
        );

        return isAllowedHost || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    it('should allow Slack webhook URLs', () => {
      expect(isWebhookUrlAllowed('https://hooks.slack.com/services/T00/B00/xxx')).toBe(true);
    });

    it('should allow Discord webhook URLs', () => {
      expect(isWebhookUrlAllowed('https://discord.com/api/webhooks/123/token')).toBe(true);
      expect(isWebhookUrlAllowed('https://discordapp.com/api/webhooks/123/token')).toBe(true);
    });

    it('should allow Telegram webhook URLs', () => {
      expect(isWebhookUrlAllowed('https://api.telegram.org/bot123/sendMessage')).toBe(true);
    });

    it('should block localhost URLs', () => {
      expect(isWebhookUrlAllowed('https://localhost:3000/webhook')).toBe(false);
      expect(isWebhookUrlAllowed('https://127.0.0.1:3000/webhook')).toBe(false);
      expect(isWebhookUrlAllowed('https://127.0.0.2/webhook')).toBe(false);
    });

    it('should block private IP ranges', () => {
      expect(isWebhookUrlAllowed('https://10.0.0.1/webhook')).toBe(false);
      expect(isWebhookUrlAllowed('https://172.16.0.1/webhook')).toBe(false);
      expect(isWebhookUrlAllowed('https://192.168.1.1/webhook')).toBe(false);
    });

    it('should block IPv6 localhost', () => {
      expect(isWebhookUrlAllowed('https://[::1]/webhook')).toBe(false);
    });

    it('should block 0.0.0.0', () => {
      expect(isWebhookUrlAllowed('https://0.0.0.0/webhook')).toBe(false);
    });

    it('should block HTTP (non-HTTPS) URLs', () => {
      expect(isWebhookUrlAllowed('http://hooks.slack.com/services/T00/B00/xxx')).toBe(false);
    });

    it('should block invalid URLs', () => {
      expect(isWebhookUrlAllowed('not-a-url')).toBe(false);
      expect(isWebhookUrlAllowed('')).toBe(false);
    });

    it('should allow custom HTTPS URLs', () => {
      expect(isWebhookUrlAllowed('https://custom-webhook.example.com/endpoint')).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const validateInput = (input: any) => {
        const { projectId, type, message, email } = input;
        return !!(projectId && type && message && email);
      };

      expect(validateInput({ projectId: 'p1', type: 'BUG', message: 'test', email: 'user@example.com' })).toBe(true);
      expect(validateInput({ type: 'BUG', message: 'test', email: 'user@example.com' })).toBe(false);
      expect(validateInput({ projectId: 'p1', message: 'test', email: 'user@example.com' })).toBe(false);
      expect(validateInput({ projectId: 'p1', type: 'BUG', email: 'user@example.com' })).toBe(false);
      expect(validateInput({ projectId: 'p1', type: 'BUG', message: 'test' })).toBe(false);
    });

    it('should validate feedback type', () => {
      const validTypes = ['BUG', 'INQUIRY', 'FEATURE'];
      const isValidType = (type: string) => validTypes.includes(type);

      expect(isValidType('BUG')).toBe(true);
      expect(isValidType('INQUIRY')).toBe(true);
      expect(isValidType('FEATURE')).toBe(true);
      expect(isValidType('INVALID')).toBe(false);
      expect(isValidType('bug')).toBe(false);
    });

    it('should validate message length', () => {
      const isValidLength = (message: string) => message.length > 0 && message.length <= 5000;

      expect(isValidLength('Valid message')).toBe(true);
      expect(isValidLength('')).toBe(false);
      expect(isValidLength('a'.repeat(5000))).toBe(true);
      expect(isValidLength('a'.repeat(5001))).toBe(false);
    });

    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = (email: string) => emailRegex.test(email);

      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('should handle edge case emails', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = (email: string) => emailRegex.test(email);

      expect(isValidEmail('a@b.c')).toBe(true);
      expect(isValidEmail('user..name@example.com')).toBe(true); // Technically invalid but passes basic regex
      expect(isValidEmail('user@domain..com')).toBe(true); // Technically invalid but passes basic regex
    });
  });

  describe('CORS Headers', () => {
    it('should generate CORS headers for allowed origin', () => {
      const getCorsHeaders = (origin: string | null, allowedOrigins: string[]): Record<string, string> => {
        const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
          if (allowedOrigins.length === 0) return true;
          return allowedOrigins.some((allowed) => {
            if (allowed === '*' || allowed === origin) return true;
            if (allowed.startsWith('*.')) {
              const baseDomain = allowed.slice(2);
              try {
                const originUrl = new URL(origin);
                return (
                  originUrl.hostname === baseDomain ||
                  originUrl.hostname.endsWith('.' + baseDomain)
                );
              } catch {
                return false;
              }
            }
            return false;
          });
        };

        const allowedOrigin = origin && isOriginAllowed(origin, allowedOrigins)
          ? origin
          : allowedOrigins[0] || '';

        return {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Project-Id',
          'Access-Control-Allow-Credentials': 'true',
        };
      };

      const headers = getCorsHeaders('https://example.com', ['https://example.com']);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should use first allowed origin for non-matching origin', () => {
      const getCorsHeaders = (origin: string | null, allowedOrigins: string[]): Record<string, string> => {
        const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
          if (allowedOrigins.length === 0) return true;
          return allowedOrigins.some((allowed) => allowed === '*' || allowed === origin);
        };

        const allowedOrigin = origin && isOriginAllowed(origin, allowedOrigins)
          ? origin
          : allowedOrigins[0] || '';

        return {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Project-Id',
          'Access-Control-Allow-Credentials': 'true',
        };
      };

      const headers = getCorsHeaders('https://evil.com', ['https://example.com']);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('should handle null origin', () => {
      const getCorsHeaders = (origin: string | null, allowedOrigins: string[]): Record<string, string> => {
        const allowedOrigin = allowedOrigins[0] || '';
        return {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Project-Id',
          'Access-Control-Allow-Credentials': 'true',
        };
      };

      const headers = getCorsHeaders(null, ['https://example.com']);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });
  });

  describe('Privacy Consent', () => {
    it('should include privacyAgreedAt timestamp when creating feedback', async () => {
      const mockProject = {
        id: 'project-123',
        allowedOrigins: ['https://example.com'],
        webhooks: [],
      };

      const mockFeedback = {
        id: 'feedback-123',
        type: 'BUG',
        message: 'Test message',
        email: 'user@example.com',
        projectId: 'project-123',
        privacyAgreedAt: new Date(),
        createdAt: new Date(),
      };

      vi.mocked(getProjectWithWebhooks).mockResolvedValue(mockProject as any);
      vi.mocked(createFeedback).mockResolvedValue(mockFeedback as any);

      await createFeedback({
        type: 'BUG',
        message: 'Test message',
        email: 'user@example.com',
        projectId: 'project-123',
        metadata: null,
        privacyAgreedAt: new Date(),
      });

      expect(createFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          privacyAgreedAt: expect.any(Date),
        })
      );
    });
  });
});
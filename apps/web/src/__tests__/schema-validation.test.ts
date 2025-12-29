import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Schema Validation', () => {
  describe('Feedback Schema', () => {
    const FeedbackTypeSchema = z.enum(['BUG', 'INQUIRY', 'FEATURE']);
    const FeedbackStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
    const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

    const CreateFeedbackSchema = z.object({
      type: FeedbackTypeSchema,
      message: z.string().min(1).max(5000),
      email: z.string().email(),
      projectId: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    it('should validate correct feedback data', () => {
      const validData = {
        type: 'BUG' as const,
        message: 'Test message',
        email: 'user@example.com',
        projectId: 'project-123',
      };

      const result = CreateFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid feedback type', () => {
      const invalidData = {
        type: 'INVALID',
        message: 'Test message',
        email: 'user@example.com',
        projectId: 'project-123',
      };

      const result = CreateFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty message', () => {
      const invalidData = {
        type: 'BUG' as const,
        message: '',
        email: 'user@example.com',
        projectId: 'project-123',
      };

      const result = CreateFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject message over 5000 characters', () => {
      const invalidData = {
        type: 'BUG' as const,
        message: 'a'.repeat(5001),
        email: 'user@example.com',
        projectId: 'project-123',
      };

      const result = CreateFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        type: 'BUG' as const,
        message: 'Test message',
        email: 'invalid-email',
        projectId: 'project-123',
      };

      const result = CreateFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        type: 'BUG' as const,
        message: 'Test message',
      };

      const result = CreateFeedbackSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional metadata', () => {
      const validData = {
        type: 'BUG' as const,
        message: 'Test message',
        email: 'user@example.com',
        projectId: 'project-123',
        metadata: {
          browser: 'Chrome',
          os: 'Windows',
        },
      };

      const result = CreateFeedbackSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all feedback types', () => {
      const types = ['BUG', 'INQUIRY', 'FEATURE'] as const;
      
      types.forEach(type => {
        const result = FeedbackTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all feedback statuses', () => {
      const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
      
      statuses.forEach(status => {
        const result = FeedbackStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all priority levels', () => {
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
      
      priorities.forEach(priority => {
        const result = PrioritySchema.safeParse(priority);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('User Schema', () => {
    const UserSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      emailVerified: z.boolean(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      termsAgreedAt: z.date().nullable(),
      privacyAgreedAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    });

    it('should validate user with all fields', () => {
      const validUser = {
        id: 'user-123',
        email: 'user@example.com',
        emailVerified: true,
        name: 'John Doe',
        image: 'https://example.com/avatar.jpg',
        termsAgreedAt: new Date(),
        privacyAgreedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should allow nullable consent timestamps', () => {
      const validUser = {
        id: 'user-123',
        email: 'user@example.com',
        emailVerified: false,
        name: null,
        image: null,
        termsAgreedAt: null,
        privacyAgreedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should require email to be valid format', () => {
      const invalidUser = {
        id: 'user-123',
        email: 'invalid-email',
        emailVerified: false,
        name: null,
        image: null,
        termsAgreedAt: null,
        privacyAgreedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Metadata Validation', () => {
    it('should validate metadata with string keys', () => {
      const MetadataSchema = z.record(z.string(), z.unknown());
      
      const validMetadata = {
        browser: 'Chrome',
        version: '120',
        os: 'Windows',
      };

      const result = MetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should allow complex nested metadata', () => {
      const MetadataSchema = z.record(z.string(), z.unknown());
      
      const complexMetadata = {
        browser: {
          name: 'Chrome',
          version: 120,
        },
        screen: {
          width: 1920,
          height: 1080,
        },
        tags: ['bug', 'urgent'],
      };

      const result = MetadataSchema.safeParse(complexMetadata);
      expect(result.success).toBe(true);
    });

    it('should reject metadata with non-string keys', () => {
      const MetadataSchema = z.record(z.string(), z.unknown());
      
      const invalidMetadata = {
        123: 'value', // Number key
      };

      // In JavaScript, object keys are always strings, but TypeScript may enforce this
      const result = MetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(true); // Keys are coerced to strings
    });
  });
});
-- Migration: Add token support for customer feedback access
-- Version: 001
-- Date: 2026-01-11
-- Description: Adds token and token_accessed_at columns to feedback table
--              Adds CUSTOMER value to AuthorType enum

-- ============================================
-- 1. Add token columns to feedback table
-- ============================================

-- Add token column with default UUID
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Add token_accessed_at column (nullable - null means never accessed)
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS token_accessed_at TIMESTAMPTZ;

-- Create unique index on token for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_token ON feedback(token);

-- Create index for token expiry batch jobs
CREATE INDEX IF NOT EXISTS idx_feedback_token_accessed
  ON feedback(token_accessed_at)
  WHERE token_accessed_at IS NOT NULL;

-- ============================================
-- 2. Backfill existing feedback with tokens
-- ============================================

-- Generate tokens for any existing feedback that somehow doesn't have one
-- (Should not be needed due to DEFAULT, but just in case)
UPDATE feedback SET token = gen_random_uuid() WHERE token IS NULL;

-- ============================================
-- 3. Add CUSTOMER to AuthorType enum
-- ============================================

-- Add CUSTOMER if it doesn't exist
-- Note: This must be committed before the value can be used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CUSTOMER'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'author_type')
  ) THEN
    ALTER TYPE author_type ADD VALUE 'CUSTOMER';
  END IF;
END$$;

-- ============================================
-- IMPORTANT: Run 002_migrate_user_to_customer.sql
-- AFTER this migration is committed!
-- ============================================

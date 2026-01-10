-- Migration: Migrate USER to CUSTOMER in reply table
-- Version: 002
-- Date: 2026-01-11
-- Description: Updates existing 'USER' author_type values to 'CUSTOMER'
--
-- PREREQUISITE: 001_add_feedback_token.sql must be committed first!
-- The CUSTOMER enum value must exist before this migration runs.

-- ============================================
-- Update existing 'USER' values to 'CUSTOMER'
-- ============================================

-- Note: This is a one-way migration. If you have 'USER' data, back it up first.
UPDATE reply SET author_type = 'CUSTOMER' WHERE author_type = 'USER';

-- ============================================
-- Verification
-- ============================================

-- Check that no USER values remain:
-- SELECT COUNT(*) FROM reply WHERE author_type = 'USER';

-- Note: PostgreSQL doesn't support removing enum values easily.
-- The 'USER' value will remain in the enum but won't be used.
-- For a clean enum, you would need to recreate the type.

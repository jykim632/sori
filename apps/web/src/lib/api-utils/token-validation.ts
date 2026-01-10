/**
 * Token validation utilities for public ticket API
 */

// UUID v4 validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4 format
 */
export function isValidUUID(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }
  return UUID_REGEX.test(token);
}

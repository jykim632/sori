import { describe, it, expect } from "vitest";
import { isValidUUID } from "./token-validation.ts";

describe("isValidUUID", () => {
  describe("valid UUIDs", () => {
    it("should return true for valid UUID v4 (lowercase)", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    });

    it("should return true for valid UUID v4 (uppercase)", () => {
      expect(isValidUUID("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
    });

    it("should return true for valid UUID v4 (mixed case)", () => {
      expect(isValidUUID("123e4567-E89B-12d3-A456-426614174000")).toBe(true);
    });

    it("should return true for UUID with all zeros", () => {
      expect(isValidUUID("00000000-0000-0000-0000-000000000000")).toBe(true);
    });

    it("should return true for UUID with all f's", () => {
      expect(isValidUUID("ffffffff-ffff-ffff-ffff-ffffffffffff")).toBe(true);
    });
  });

  describe("invalid UUIDs", () => {
    it("should return false for empty string", () => {
      expect(isValidUUID("")).toBe(false);
    });

    it("should return false for null-like values", () => {
      expect(isValidUUID(null as unknown as string)).toBe(false);
      expect(isValidUUID(undefined as unknown as string)).toBe(false);
    });

    it("should return false for UUID without dashes", () => {
      expect(isValidUUID("123e4567e89b12d3a456426614174000")).toBe(false);
    });

    it("should return false for UUID with wrong dash positions", () => {
      expect(isValidUUID("123e456-7e89b-12d3-a456-426614174000")).toBe(false);
    });

    it("should return false for UUID with invalid characters", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400g")).toBe(false);
      expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400!")).toBe(false);
    });

    it("should return false for UUID that is too short", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456")).toBe(false);
    });

    it("should return false for UUID that is too long", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-4266141740000")).toBe(false);
    });

    it("should return false for random strings", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false);
      expect(isValidUUID("hello world")).toBe(false);
      expect(isValidUUID("12345")).toBe(false);
    });

    it("should return false for numeric input", () => {
      expect(isValidUUID(12345 as unknown as string)).toBe(false);
    });
  });
});

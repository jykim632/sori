import { describe, it, expect } from "vitest";
import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  describe("valid emails", () => {
    it("returns true for standard email format", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
    });

    it("returns true for email with subdomain", () => {
      expect(isValidEmail("user@mail.example.com")).toBe(true);
    });

    it("returns true for email with plus sign", () => {
      expect(isValidEmail("user+tag@example.com")).toBe(true);
    });

    it("returns true for email with dots in local part", () => {
      expect(isValidEmail("first.last@example.com")).toBe(true);
    });

    it("returns true for email with numbers", () => {
      expect(isValidEmail("user123@example123.com")).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("returns false for empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });

    it("returns false for string without @", () => {
      expect(isValidEmail("testexample.com")).toBe(false);
    });

    it("returns false for string without domain", () => {
      expect(isValidEmail("test@")).toBe(false);
    });

    it("returns false for string without local part", () => {
      expect(isValidEmail("@example.com")).toBe(false);
    });

    it("returns false for string without TLD", () => {
      expect(isValidEmail("test@example")).toBe(false);
    });

    it("returns false for string with spaces", () => {
      expect(isValidEmail("test @example.com")).toBe(false);
    });

    it("returns false for multiple @ signs", () => {
      expect(isValidEmail("test@@example.com")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for null-like values", () => {
      expect(isValidEmail(null as unknown as string)).toBe(false);
      expect(isValidEmail(undefined as unknown as string)).toBe(false);
    });

    it("returns false for whitespace only", () => {
      expect(isValidEmail("   ")).toBe(false);
    });
  });
});

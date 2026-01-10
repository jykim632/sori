import { describe, it, expect } from "vitest";
import {
  ReplySchema,
  CreateReplySchema,
  UpdateReplySchema,
} from "./reply.ts";
import { AuthorTypeSchema } from "./enums.ts";

describe("AuthorTypeSchema", () => {
  it("should accept valid author types", () => {
    expect(AuthorTypeSchema.parse("CUSTOMER")).toBe("CUSTOMER");
    expect(AuthorTypeSchema.parse("ADMIN")).toBe("ADMIN");
    expect(AuthorTypeSchema.parse("API")).toBe("API");
  });

  it("should reject invalid author types", () => {
    expect(() => AuthorTypeSchema.parse("USER")).toThrow();
    expect(() => AuthorTypeSchema.parse("INVALID")).toThrow();
    expect(() => AuthorTypeSchema.parse("")).toThrow();
  });
});

describe("ReplySchema", () => {
  const validReply = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    content: "This is a reply",
    feedbackId: "123e4567-e89b-12d3-a456-426614174001",
    authorId: "123e4567-e89b-12d3-a456-426614174002",
    authorName: "John Doe",
    authorType: "ADMIN",
    isInternal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should accept valid reply data", () => {
    const result = ReplySchema.parse(validReply);
    expect(result.content).toBe("This is a reply");
    expect(result.authorType).toBe("ADMIN");
  });

  it("should accept null authorId for CUSTOMER", () => {
    const customerReply = {
      ...validReply,
      authorId: null,
      authorType: "CUSTOMER",
    };
    const result = ReplySchema.parse(customerReply);
    expect(result.authorId).toBeNull();
  });

  it("should accept null authorName", () => {
    const result = ReplySchema.parse({
      ...validReply,
      authorName: null,
    });
    expect(result.authorName).toBeNull();
  });

  it("should coerce date strings to Date objects", () => {
    const result = ReplySchema.parse({
      ...validReply,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    });
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("should reject invalid authorType", () => {
    expect(() =>
      ReplySchema.parse({
        ...validReply,
        authorType: "INVALID",
      })
    ).toThrow();
  });
});

describe("CreateReplySchema", () => {
  it("should accept valid create input with required fields only", () => {
    const input = {
      content: "This is a reply",
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
    };
    const result = CreateReplySchema.parse(input);
    expect(result.content).toBe("This is a reply");
    expect(result.isInternal).toBe(false); // default value
  });

  it("should accept optional authorName", () => {
    const input = {
      content: "This is a reply",
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
      authorName: "John Doe",
    };
    const result = CreateReplySchema.parse(input);
    expect(result.authorName).toBe("John Doe");
  });

  it("should accept isInternal flag", () => {
    const input = {
      content: "Internal note",
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
      isInternal: true,
    };
    const result = CreateReplySchema.parse(input);
    expect(result.isInternal).toBe(true);
  });

  it("should reject empty content", () => {
    const input = {
      content: "",
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
    };
    expect(() => CreateReplySchema.parse(input)).toThrow();
  });

  it("should reject content exceeding 10000 characters", () => {
    const input = {
      content: "a".repeat(10001),
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
    };
    expect(() => CreateReplySchema.parse(input)).toThrow();
  });

  it("should accept content at exactly 10000 characters", () => {
    const input = {
      content: "a".repeat(10000),
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
    };
    const result = CreateReplySchema.parse(input);
    expect(result.content.length).toBe(10000);
  });

  it("should reject authorName exceeding 100 characters", () => {
    const input = {
      content: "This is a reply",
      feedbackId: "123e4567-e89b-12d3-a456-426614174001",
      authorName: "a".repeat(101),
    };
    expect(() => CreateReplySchema.parse(input)).toThrow();
  });

  it("should reject missing required fields", () => {
    expect(() => CreateReplySchema.parse({})).toThrow();
    expect(() => CreateReplySchema.parse({ content: "test" })).toThrow();
    expect(() =>
      CreateReplySchema.parse({ feedbackId: "123" })
    ).toThrow();
  });
});

describe("UpdateReplySchema", () => {
  it("should accept valid update input", () => {
    const result = UpdateReplySchema.parse({ content: "Updated content" });
    expect(result.content).toBe("Updated content");
  });

  it("should reject empty content", () => {
    expect(() => UpdateReplySchema.parse({ content: "" })).toThrow();
  });

  it("should reject content exceeding 10000 characters", () => {
    expect(() =>
      UpdateReplySchema.parse({ content: "a".repeat(10001) })
    ).toThrow();
  });
});

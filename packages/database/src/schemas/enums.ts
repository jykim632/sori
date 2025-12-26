import { z } from "zod";

// 멤버 역할
export const MemberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

// 요금제
export const PlanSchema = z.enum(["FREE", "PRO", "TEAM", "ENTERPRISE"]);

// 언어
export const LocaleSchema = z.enum(["KO", "EN"]);

// 피드백 타입
export const FeedbackTypeSchema = z.enum(["BUG", "INQUIRY", "FEATURE"]);

// 피드백 상태
export const FeedbackStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

// 우선순위
export const PrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// 웹훅 타입
export const WebhookTypeSchema = z.enum([
  "SLACK",
  "DISCORD",
  "TELEGRAM",
  "CUSTOM",
]);

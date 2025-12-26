import { z } from "zod";

// Enums
import {
  MemberRoleSchema,
  PlanSchema,
  LocaleSchema,
  FeedbackTypeSchema,
  FeedbackStatusSchema,
  PrioritySchema,
  WebhookTypeSchema,
} from "./schemas/enums.ts";

// Models
import { UserSchema, SessionSchema, AccountSchema, VerificationSchema } from "./schemas/user.ts";
import {
  OrganizationSchema,
  OrganizationMemberSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from "./schemas/organization.ts";
import { ProjectSchema, CreateProjectSchema, UpdateProjectSchema } from "./schemas/project.ts";
import {
  FeedbackSchema,
  CreateFeedbackSchema,
  UpdateFeedbackStatusSchema,
} from "./schemas/feedback.ts";
import { WebhookSchema, CreateWebhookSchema, UpdateWebhookSchema } from "./schemas/webhook.ts";
import {
  AuthorTypeSchema,
  ReplySchema,
  CreateReplySchema,
  UpdateReplySchema,
} from "./schemas/reply.ts";

// Enum Types
export type MemberRole = z.infer<typeof MemberRoleSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type WebhookType = z.infer<typeof WebhookTypeSchema>;

// Model Types
export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type Verification = z.infer<typeof VerificationSchema>;

export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

export type Feedback = z.infer<typeof FeedbackSchema>;
export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;
export type UpdateFeedbackStatus = z.infer<typeof UpdateFeedbackStatusSchema>;

export type Webhook = z.infer<typeof WebhookSchema>;
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;

export type AuthorType = z.infer<typeof AuthorTypeSchema>;
export type Reply = z.infer<typeof ReplySchema>;
export type CreateReply = z.infer<typeof CreateReplySchema>;
export type UpdateReply = z.infer<typeof UpdateReplySchema>;

// Extended types with relations
export type OrganizationWithMembers = Organization & {
  members: (OrganizationMember & { user: Pick<User, "id" | "name" | "email"> })[];
};

export type OrganizationWithProjects = Organization & {
  projects: Project[];
  members: (OrganizationMember & { user: Pick<User, "id" | "name" | "email"> })[];
};

export type ProjectWithOrganization = Project & {
  organization: Organization;
};

export type FeedbackWithProject = Feedback & {
  project: Project;
};

export type FeedbackWithReplies = Feedback & {
  replies: Reply[];
};

export type WebhookWithOrganization = Webhook & {
  organization: Organization;
};

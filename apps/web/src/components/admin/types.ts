import type {
  FeedbackStatus,
  FeedbackType,
  FeedbackWithProject,
  Project,
  Webhook,
  Reply,
} from "@sori/database";

export type OrderBy = "createdAt" | "priority";
export type Order = "asc" | "desc";

export type FeedbackSearchParams = {
  status?: FeedbackStatus;
  type?: FeedbackType;
  project?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  orderBy?: OrderBy;
  order?: Order;
  page?: number;
};

export type FeedbackMetadata = {
  url?: string;
  userAgent?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role?: string;
};

export type AdminLoaderData = {
  feedbacks: FeedbackWithProject[];
  pagination: Pagination;
  projects: Project[];
  webhooks: Webhook[];
  currentOrg: Organization;
};

export type AdminRouteContext = {
  session: { user?: { email?: string } } | null;
  organizations: Organization[];
};

export const validStatuses: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export const validTypes: FeedbackType[] = ["BUG", "INQUIRY", "FEATURE"];
export const validOrderBy: OrderBy[] = ["createdAt", "priority"];
export const validOrder: Order[] = ["asc", "desc"];

export type { FeedbackStatus, FeedbackType, FeedbackWithProject, Project, Webhook, Reply };

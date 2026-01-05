import type { FeedbackType, Project, Organization } from "@sori/database";

/**
 * 웹훅 페이로드에 필요한 피드백 데이터
 * metadata는 웹훅에서 url만 사용하므로 특화된 타입 정의
 */
export interface FeedbackData {
  id: string;
  type: FeedbackType;
  message: string;
  email: string | null;
  metadata: { url?: string } | null;
}

/**
 * 웹훅 페이로드에 필요한 프로젝트 데이터
 */
export type ProjectData = Pick<Project, "id" | "name">;

/**
 * 웹훅 페이로드에 필요한 조직 데이터
 */
export type OrganizationData = Pick<Organization, "id" | "name">;

export interface WebhookContext {
  feedback: FeedbackData;
  project: ProjectData;
  organization: OrganizationData;
  isTest: boolean;
}

export interface WebhookFormatter {
  format(context: WebhookContext): unknown;
}

export interface TypeInfo {
  emoji: string;
  label: string;
}

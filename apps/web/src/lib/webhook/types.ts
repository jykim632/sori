export interface FeedbackData {
  id: string;
  type: string;
  message: string;
  email: string | null;
  metadata: { url?: string } | null;
}

export interface ProjectData {
  id: string;
  name: string;
}

export interface OrganizationData {
  id: string;
  name: string;
}

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

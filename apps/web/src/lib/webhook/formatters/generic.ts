import type { WebhookFormatter, WebhookContext } from "../types";

export const genericFormatter: WebhookFormatter = {
  format(context: WebhookContext) {
    const { feedback, project, organization, isTest } = context;

    return {
      event: isTest ? "webhook.test" : "feedback.created",
      timestamp: new Date().toISOString(),
      feedback,
      project,
      organization,
    };
  },
};

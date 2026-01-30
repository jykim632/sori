import { formatWebhookPayload } from "./index";
import type { ProjectData, OrganizationData } from "./types";

interface TestWebhookParams {
  webhookUrl: string;
  project: ProjectData;
  organization: OrganizationData;
}

interface TestWebhookResult {
  success: boolean;
  message: string;
}

export async function sendTestWebhook(
  params: TestWebhookParams
): Promise<TestWebhookResult> {
  const { webhookUrl, project, organization } = params;

  const testFeedback = {
    id: "test_" + Date.now(),
    type: "BUG" as const,
    message: "이것은 테스트 피드백입니다.",
    email: "test@example.com",
    metadata: { url: "https://example.com" },
  };

  const payload = formatWebhookPayload(
    webhookUrl,
    testFeedback,
    project,
    organization,
    true
  );

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Sori-Webhook/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, message: `성공! (${response.status})` };
    }

    const text = await response.text().catch(() => "");
    return {
      success: false,
      message: `실패: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 100)}` : ""}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "연결 실패",
    };
  }
}

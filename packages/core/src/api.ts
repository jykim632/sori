import type { FeedbackPayload } from "./types";

const DEFAULT_API_URL = "https://api.sori.io";

export async function submitFeedback(
  projectId: string,
  payload: FeedbackPayload,
  apiUrl: string = DEFAULT_API_URL
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Project-Id": projectId,
      },
      body: JSON.stringify({
        ...payload,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          locale: navigator.language,
          timestamp: new Date().toISOString(),
          ...payload.metadata,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.message || "Request failed" };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

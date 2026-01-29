/**
 * CDN entry point
 * Auto-initializes widget from script tag data attributes
 * Fetches widget config from server for dynamic settings
 *
 * Usage:
 * <script src="https://cdn.sori.life/widget.js" data-project-id="your-project-id"></script>
 */

import { createWidget, type CreateWidgetOptions } from "./widget";
import type { SoriConfig, SoriInstance, WidgetConfig } from "./types";

// Export for manual initialization
export { createWidget };
export type { SoriConfig, SoriInstance };

const DEFAULT_API_URL = "https://web.sori.life";

interface WidgetConfigResponse {
  projectId: string;
  config: WidgetConfig | null;
}

// Fetch widget config from server
async function fetchWidgetConfig(
  projectId: string,
  apiUrl: string
): Promise<WidgetConfig | null> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/projects/${projectId}/widget-config`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      console.warn(`[Sori] Failed to fetch widget config: ${response.status}`);
      return null;
    }

    const data: WidgetConfigResponse = await response.json();
    return data.config;
  } catch (error) {
    console.warn("[Sori] Failed to fetch widget config:", error);
    return null;
  }
}

// Auto-init from script tag
async function autoInit() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const projectId = script.dataset.projectId;
  if (!projectId) {
    console.warn("[Sori] Missing data-project-id attribute");
    return;
  }

  const apiUrl = script.dataset.apiUrl || DEFAULT_API_URL;

  // Build base config from data attributes (fallback values)
  const baseConfig: SoriConfig = {
    projectId,
    apiUrl,
    position: script.dataset.position as SoriConfig["position"],
    primaryColor: script.dataset.color,
    greeting: script.dataset.greeting,
    locale: script.dataset.locale as SoriConfig["locale"],
    zIndex: script.dataset.zIndex ? parseInt(script.dataset.zIndex, 10) : undefined,
  };

  // Remove undefined values
  Object.keys(baseConfig).forEach((key) => {
    if (baseConfig[key as keyof SoriConfig] === undefined) {
      delete baseConfig[key as keyof SoriConfig];
    }
  });

  // Fetch server config
  const widgetConfig = await fetchWidgetConfig(projectId, apiUrl);

  // Combine: server config takes priority, data attributes as fallback
  const finalConfig: CreateWidgetOptions = {
    ...baseConfig,
    widgetConfig: widgetConfig || undefined,
  };

  // Initialize widget
  const initWidget = () => {
    (window as unknown as { Sori: SoriInstance }).Sori = createWidget(finalConfig);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
}

autoInit();

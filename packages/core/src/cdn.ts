/**
 * CDN entry point
 * Auto-initializes widget from script tag data attributes
 *
 * Usage:
 * <script src="https://cdn.sori.io/widget.js" data-project-id="your-project-id"></script>
 */

import { createWidget } from "./widget";
import type { SoriConfig, SoriInstance } from "./types";

// Export for manual initialization
export { createWidget };
export type { SoriConfig, SoriInstance };

// Auto-init from script tag
function autoInit() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const projectId = script.dataset.projectId;
  if (!projectId) {
    console.warn("[Sori] Missing data-project-id attribute");
    return;
  }

  const config: SoriConfig = {
    projectId,
    apiUrl: script.dataset.apiUrl,
    position: script.dataset.position as SoriConfig["position"],
    primaryColor: script.dataset.color,
    greeting: script.dataset.greeting,
    locale: script.dataset.locale as SoriConfig["locale"],
    zIndex: script.dataset.zIndex ? parseInt(script.dataset.zIndex, 10) : undefined,
  };

  // Remove undefined values
  Object.keys(config).forEach((key) => {
    if (config[key as keyof SoriConfig] === undefined) {
      delete config[key as keyof SoriConfig];
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { Sori: SoriInstance }).Sori = createWidget(config);
    });
  } else {
    (window as unknown as { Sori: SoriInstance }).Sori = createWidget(config);
  }
}

autoInit();

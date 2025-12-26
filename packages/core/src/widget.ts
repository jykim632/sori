import type { SoriConfig, SoriInstance, FeedbackType } from "./types";
import { getStyles } from "./styles";
import { i18n, type Locale } from "./i18n";
import { submitFeedback } from "./api";
import { icons } from "./icons";

const DEFAULT_CONFIG: Required<Omit<SoriConfig, "projectId">> = {
  apiUrl: "https://api.sori.io",
  position: "bottom-right",
  primaryColor: "#4F46E5",
  greeting: "",
  types: ["BUG", "INQUIRY", "FEATURE"],
  locale: "ko",
  zIndex: 9999,
};

export function createWidget(userConfig: SoriConfig): SoriInstance {
  const config: Required<SoriConfig> = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    greeting: userConfig.greeting || i18n[userConfig.locale || "ko"].greeting,
  };

  const t = i18n[config.locale as Locale];
  let isOpen = false;
  let selectedType: FeedbackType = config.types[0] || "INQUIRY";
  let isSubmitting = false;
  let showSuccess = false;

  // Create shadow DOM for style isolation
  const host = document.createElement("div");
  host.id = "sori-widget";
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles
  const style = document.createElement("style");
  style.textContent = getStyles(config.primaryColor, config.position, config.zIndex);
  shadow.appendChild(style);

  // Create container
  const container = document.createElement("div");
  container.className = "sori-container";
  container.innerHTML = `
    <div class="sori-panel">
      <div class="sori-header">
        <div class="sori-greeting">${config.greeting}</div>
      </div>
      <div class="sori-body">
        <div class="sori-form">
          <div class="sori-types">
            ${config.types
              .map(
                (type) =>
                  `<button class="sori-type-btn${type === selectedType ? " active" : ""}" data-type="${type}">${t.types[type]}</button>`
              )
              .join("")}
          </div>
          <textarea class="sori-textarea" placeholder="${t.placeholder}"></textarea>
          <input type="email" class="sori-input" placeholder="${t.emailPlaceholder}" />
          <button class="sori-submit">${t.submit}</button>
        </div>
        <div class="sori-success" style="display: none;">
          ${icons.check}
          <div>${t.success}</div>
        </div>
      </div>
    </div>
    <button class="sori-trigger">${icons.chat}</button>
  `;
  shadow.appendChild(container);

  // Elements
  const panel = container.querySelector(".sori-panel") as HTMLElement;
  const trigger = container.querySelector(".sori-trigger") as HTMLButtonElement;
  const textarea = container.querySelector(".sori-textarea") as HTMLTextAreaElement;
  const emailInput = container.querySelector(".sori-input") as HTMLInputElement;
  const submitBtn = container.querySelector(".sori-submit") as HTMLButtonElement;
  const typeButtons = container.querySelectorAll(".sori-type-btn");
  const form = container.querySelector(".sori-form") as HTMLElement;
  const successEl = container.querySelector(".sori-success") as HTMLElement;

  // Event handlers
  function open() {
    isOpen = true;
    panel.classList.add("open");
    trigger.innerHTML = icons.close;
  }

  function close() {
    isOpen = false;
    panel.classList.remove("open");
    trigger.innerHTML = icons.chat;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function resetForm() {
    textarea.value = "";
    emailInput.value = "";
    showSuccess = false;
    form.style.display = "block";
    successEl.style.display = "none";
  }

  async function handleSubmit() {
    if (isSubmitting || !textarea.value.trim()) return;

    isSubmitting = true;
    submitBtn.disabled = true;

    const result = await submitFeedback(config.projectId, {
      type: selectedType,
      message: textarea.value.trim(),
      email: emailInput.value.trim() || undefined,
    }, config.apiUrl);

    isSubmitting = false;
    submitBtn.disabled = false;

    if (result.success) {
      showSuccess = true;
      form.style.display = "none";
      successEl.style.display = "block";

      setTimeout(() => {
        close();
        setTimeout(resetForm, 300);
      }, 2000);
    } else {
      alert(t.error);
    }
  }

  // Bind events
  trigger.addEventListener("click", toggle);

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = btn.getAttribute("data-type") as FeedbackType;
      typeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  submitBtn.addEventListener("click", handleSubmit);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (isOpen && !host.contains(e.target as Node)) {
      close();
    }
  });

  // Mount
  document.body.appendChild(host);

  // Public API
  return {
    open,
    close,
    destroy() {
      host.remove();
    },
    setConfig(newConfig: Partial<SoriConfig>) {
      Object.assign(config, newConfig);
      // Re-render would go here if needed
    },
  };
}

import type {
  ThemePreset,
  ThemeStyles,
  WidgetConfig,
  SizeToken,
  BorderRadiusToken,
  ShadowToken,
} from "./types";

/**
 * Size token to CSS value mappings
 */
const SIZE_VALUES = {
  fontSize: { sm: "12px", md: "14px", lg: "16px" },
  triggerSize: { sm: "40px", md: "56px", lg: "72px" },
  panelWidth: { sm: "280px", md: "320px", lg: "400px" },
} as const;

const BORDER_RADIUS_VALUES: Record<BorderRadiusToken, string> = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "16px",
  full: "9999px",
};

const SHADOW_VALUES: Record<ShadowToken, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0, 0, 0, 0.1)",
  md: "0 4px 12px rgba(0, 0, 0, 0.15)",
  lg: "0 8px 30px rgba(0, 0, 0, 0.2)",
};

/**
 * Theme presets
 */
export const THEME_PRESETS: Record<ThemePreset, ThemeStyles> = {
  default: {
    primaryColor: "#4F46E5",
    backgroundColor: "#FFFFFF",
    textColor: "#111827",
    textSecondaryColor: "#6B7280",
    borderColor: "#E5E7EB",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: "md",
    triggerSize: "md",
    panelWidth: "md",
    borderRadius: "md",
    shadow: "md",
  },
  minimal: {
    primaryColor: "#18181B",
    backgroundColor: "#FFFFFF",
    textColor: "#18181B",
    textSecondaryColor: "#71717A",
    borderColor: "#E4E4E7",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: "sm",
    triggerSize: "sm",
    panelWidth: "sm",
    borderRadius: "sm",
    shadow: "sm",
  },
  rounded: {
    primaryColor: "#8B5CF6",
    backgroundColor: "#FAFAF9",
    textColor: "#1C1917",
    textSecondaryColor: "#78716C",
    borderColor: "#E7E5E4",
    fontFamily: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: "md",
    triggerSize: "lg",
    panelWidth: "md",
    borderRadius: "full",
    shadow: "lg",
  },
};

/**
 * Resolve size token to CSS value
 */
export function resolveSizeValue(
  type: "fontSize" | "triggerSize" | "panelWidth",
  token: SizeToken
): string {
  return SIZE_VALUES[type][token];
}

/**
 * Resolve border radius token to CSS value
 */
export function resolveBorderRadius(token: BorderRadiusToken): string {
  return BORDER_RADIUS_VALUES[token];
}

/**
 * Resolve shadow token to CSS value
 */
export function resolveShadow(token: ShadowToken): string {
  return SHADOW_VALUES[token];
}

/**
 * Resolve widget config to complete theme styles
 * Merges preset with custom overrides
 */
export function resolveTheme(config?: WidgetConfig): ThemeStyles {
  const preset = config?.preset || "default";
  const baseTheme = THEME_PRESETS[preset] || THEME_PRESETS.default;

  if (!config?.styles) {
    return baseTheme;
  }

  return { ...baseTheme, ...config.styles };
}

/**
 * Default widget config
 */
export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  preset: "default",
  position: "bottom-right",
  locale: "ko",
  zIndex: 9999,
};

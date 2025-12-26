export { createWidget, type CreateWidgetOptions } from "./widget";
export type {
  SoriConfig,
  SoriInstance,
  FeedbackType,
  FeedbackPayload,
  Position,
  // Theme types
  ThemePreset,
  ThemeStyles,
  WidgetConfig,
  SizeToken,
  BorderRadiusToken,
  ShadowToken,
} from "./types";

// Theme utilities
export { THEME_PRESETS, resolveTheme, DEFAULT_WIDGET_CONFIG } from "./themes";

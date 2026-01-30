export type ThemePreset = "default" | "minimal" | "rounded";
export type SizeToken = "sm" | "md" | "lg";
export type BorderRadiusToken = "none" | "sm" | "md" | "lg" | "full";
export type ShadowToken = "none" | "sm" | "md" | "lg";

export interface ThemeStyles {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  fontFamily: string;
  fontSize: SizeToken;
  triggerSize: SizeToken;
  panelWidth: SizeToken;
  borderRadius: BorderRadiusToken;
  shadow: ShadowToken;
}

export interface WidgetConfig {
  preset: ThemePreset;
  styles?: Partial<ThemeStyles>;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  greeting?: string;
  locale?: "ko" | "en";
}

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

export type ProjectType = {
  id: string;
  name: string;
  allowedOrigins: string[];
  widgetConfig: WidgetConfig | null;
  apiKey: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
};

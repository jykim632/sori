export type FeedbackType = "BUG" | "INQUIRY" | "FEATURE";

export type Position = "bottom-right" | "bottom-left" | "top-right" | "top-left";

// ===== Theme System =====

/** Theme preset identifiers */
export type ThemePreset = "default" | "minimal" | "rounded";

/** Size tokens */
export type SizeToken = "sm" | "md" | "lg";
export type BorderRadiusToken = "none" | "sm" | "md" | "lg" | "full";
export type ShadowToken = "none" | "sm" | "md" | "lg";

/** Complete style configuration for themes */
export interface ThemeStyles {
  // Colors
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;

  // Typography
  fontFamily: string;
  fontSize: SizeToken;

  // Layout
  triggerSize: SizeToken;
  panelWidth: SizeToken;
  borderRadius: BorderRadiusToken;
  shadow: ShadowToken;
}

/** Widget configuration stored in database */
export interface WidgetConfig {
  /** Theme preset */
  preset: ThemePreset;
  /** Custom style overrides */
  styles?: Partial<ThemeStyles>;
  /** Widget position */
  position?: Position;
  /** Greeting text */
  greeting?: string;
  /** Available feedback types */
  types?: FeedbackType[];
  /** Language */
  locale?: "ko" | "en";
  /** Z-index */
  zIndex?: number;
}

export interface SoriConfig {
  /** Project ID from Sori dashboard */
  projectId: string;
  /** API endpoint (default: https://web.sori.life) */
  apiUrl?: string;
  /** Widget position (default: bottom-right) */
  position?: Position;
  /** Primary color (default: #4F46E5) */
  primaryColor?: string;
  /** Greeting text */
  greeting?: string;
  /** Available feedback types */
  types?: FeedbackType[];
  /** Language (default: ko) */
  locale?: "ko" | "en";
  /** Z-index (default: 9999) */
  zIndex?: number;
}

export interface FeedbackPayload {
  type: FeedbackType;
  message: string;
  email?: string;
  metadata?: {
    url: string;
    userAgent: string;
    locale: string;
    timestamp: string;
  };
}

export interface SoriInstance {
  open: () => void;
  close: () => void;
  destroy: () => void;
  setConfig: (config: Partial<SoriConfig>) => void;
}

export type FeedbackType = "BUG" | "INQUIRY" | "FEATURE";

export type Position = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface SoriConfig {
  /** Project ID from Sori dashboard */
  projectId: string;
  /** API endpoint (default: https://api.sori.io) */
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

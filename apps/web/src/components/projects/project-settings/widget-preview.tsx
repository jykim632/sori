import { useState } from "react";
import type { ThemeStyles, SizeToken, BorderRadiusToken, ShadowToken } from "./types";

type Props = {
  theme: ThemeStyles;
  position: string;
  greeting?: string;
};

export function WidgetPreview({ theme, position, greeting }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const getSizeValue = (type: string, token: SizeToken) => {
    const sizes: Record<string, Record<SizeToken, string>> = {
      fontSize: { sm: "12px", md: "14px", lg: "16px" },
      triggerSize: { sm: "40px", md: "56px", lg: "72px" },
      panelWidth: { sm: "280px", md: "320px", lg: "400px" },
    };
    return sizes[type]?.[token] || token;
  };

  const getBorderRadius = (token: BorderRadiusToken) => {
    const values: Record<BorderRadiusToken, string> = {
      none: "0",
      sm: "4px",
      md: "8px",
      lg: "16px",
      full: "9999px",
    };
    return values[token];
  };

  const getShadow = (token: ShadowToken) => {
    const values: Record<ShadowToken, string> = {
      none: "none",
      sm: "0 1px 3px rgba(0, 0, 0, 0.1)",
      md: "0 4px 12px rgba(0, 0, 0, 0.15)",
      lg: "0 8px 30px rgba(0, 0, 0, 0.2)",
    };
    return values[token];
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    "bottom-right": { bottom: "20px", right: "20px" },
    "bottom-left": { bottom: "20px", left: "20px" },
    "top-right": { top: "20px", right: "20px" },
    "top-left": { top: "20px", left: "20px" },
  };

  const triggerSize = getSizeValue("triggerSize", theme.triggerSize);
  const panelWidth = getSizeValue("panelWidth", theme.panelWidth);
  const fontSize = getSizeValue("fontSize", theme.fontSize);
  const borderRadius = getBorderRadius(theme.borderRadius);
  const shadow = getShadow(theme.shadow);
  const triggerRadius = theme.borderRadius === "full" ? "50%" : borderRadius;

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles[position],
        fontFamily: theme.fontFamily,
        fontSize,
      }}
    >
      {/* Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            [position.includes("bottom") ? "bottom" : "top"]: `calc(${triggerSize} + 14px)`,
            [position.includes("right") ? "right" : "left"]: 0,
            width: panelWidth,
            backgroundColor: theme.backgroundColor,
            borderRadius,
            boxShadow: shadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px",
              borderBottom: `1px solid ${theme.borderColor}`,
            }}
          >
            <div style={{ fontWeight: 600, color: theme.textColor }}>
              {greeting || "무엇을 도와드릴까요?"}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "16px" }}>
            {/* Type buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {["버그", "문의", "제안"].map((type, i) => (
                <button
                  key={type}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: `1px solid ${i === 0 ? theme.primaryColor : theme.borderColor}`,
                    borderRadius: theme.borderRadius === "full" ? "16px" : borderRadius,
                    background: i === 0 ? theme.primaryColor : theme.backgroundColor,
                    color: i === 0 ? "white" : theme.textSecondaryColor,
                    fontSize: theme.fontSize === "lg" ? "14px" : "12px",
                    cursor: "pointer",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "12px",
                border: `1px solid ${theme.borderColor}`,
                borderRadius: theme.borderRadius === "full" ? "8px" : borderRadius,
                backgroundColor: theme.backgroundColor,
                color: theme.textSecondaryColor,
                marginBottom: "12px",
              }}
            >
              피드백을 입력하세요...
            </div>

            {/* Submit button */}
            <button
              style={{
                width: "100%",
                padding: "12px",
                background: theme.primaryColor,
                color: "white",
                border: "none",
                borderRadius: theme.borderRadius === "full" ? "16px" : borderRadius,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              전송
            </button>
          </div>
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: triggerSize,
          height: triggerSize,
          borderRadius: triggerRadius,
          background: theme.primaryColor,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: shadow,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          {isOpen ? (
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          )}
        </svg>
      </button>
    </div>
  );
}

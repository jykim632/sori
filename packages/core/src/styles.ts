import type { Position, ThemeStyles } from "./types";
import { resolveSizeValue, resolveBorderRadius, resolveShadow } from "./themes";

/**
 * Generate CSS styles for the widget based on theme
 */
export function getStyles(
  theme: ThemeStyles,
  position: Position,
  zIndex: number
): string {
  const {
    primaryColor,
    backgroundColor,
    textColor,
    textSecondaryColor,
    borderColor,
    fontFamily,
    fontSize,
    triggerSize,
    panelWidth,
    borderRadius,
    shadow,
  } = theme;

  // Resolve tokens to CSS values
  const fontSizeValue = resolveSizeValue("fontSize", fontSize);
  const triggerSizeValue = resolveSizeValue("triggerSize", triggerSize);
  const panelWidthValue = resolveSizeValue("panelWidth", panelWidth);
  const borderRadiusValue = resolveBorderRadius(borderRadius);
  const shadowValue = resolveShadow(shadow);

  // Trigger button uses circular shape for 'full' borderRadius
  const triggerBorderRadius = borderRadius === "full" ? "50%" : borderRadiusValue;

  // Position styles
  const positions: Record<Position, string> = {
    "bottom-right": "bottom: 20px; right: 20px;",
    "bottom-left": "bottom: 20px; left: 20px;",
    "top-right": "top: 20px; right: 20px;",
    "top-left": "top: 20px; left: 20px;",
  };

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .sori-container {
      position: fixed;
      ${positions[position]}
      z-index: ${zIndex};
      font-family: ${fontFamily};
      font-size: ${fontSizeValue};
      color: ${textColor};
    }

    .sori-trigger {
      width: ${triggerSizeValue};
      height: ${triggerSizeValue};
      border-radius: ${triggerBorderRadius};
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${shadowValue};
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .sori-trigger:hover {
      transform: scale(1.05);
      box-shadow: ${resolveShadow(shadow === "none" ? "sm" : shadow === "sm" ? "md" : "lg")};
    }

    .sori-trigger svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .sori-panel {
      position: absolute;
      ${position.includes("bottom") ? "bottom: calc(" + triggerSizeValue + " + 14px);" : "top: calc(" + triggerSizeValue + " + 14px);"}
      ${position.includes("right") ? "right: 0;" : "left: 0;"}
      width: ${panelWidthValue};
      background: ${backgroundColor};
      border-radius: ${borderRadiusValue};
      box-shadow: ${shadowValue};
      opacity: 0;
      visibility: hidden;
      transform: translateY(${position.includes("bottom") ? "10px" : "-10px"});
      transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
    }

    .sori-panel.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .sori-header {
      padding: 16px;
      border-bottom: 1px solid ${borderColor};
    }

    .sori-greeting {
      font-weight: 600;
      color: ${textColor};
    }

    .sori-body {
      padding: 16px;
    }

    .sori-types {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .sori-type-btn {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid ${borderColor};
      border-radius: ${resolveBorderRadius(borderRadius === "full" ? "lg" : borderRadius)};
      background: ${backgroundColor};
      color: ${textSecondaryColor};
      cursor: pointer;
      font-size: ${resolveSizeValue("fontSize", fontSize === "lg" ? "md" : "sm")};
      transition: all 0.15s;
    }

    .sori-type-btn:hover {
      border-color: ${primaryColor};
      color: ${primaryColor};
    }

    .sori-type-btn.active {
      background: ${primaryColor};
      border-color: ${primaryColor};
      color: white;
    }

    .sori-textarea {
      width: 100%;
      min-height: 100px;
      padding: 12px;
      border: 1px solid ${borderColor};
      border-radius: ${resolveBorderRadius(borderRadius === "full" ? "md" : borderRadius)};
      background: ${backgroundColor};
      color: ${textColor};
      resize: vertical;
      font-family: inherit;
      font-size: ${fontSizeValue};
      margin-bottom: 12px;
    }

    .sori-textarea::placeholder {
      color: ${textSecondaryColor};
    }

    .sori-textarea:focus {
      outline: none;
      border-color: ${primaryColor};
    }

    .sori-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${borderColor};
      border-radius: ${resolveBorderRadius(borderRadius === "full" ? "md" : borderRadius)};
      background: ${backgroundColor};
      color: ${textColor};
      font-family: inherit;
      font-size: ${fontSizeValue};
      margin-bottom: 12px;
    }

    .sori-input::placeholder {
      color: ${textSecondaryColor};
    }

    .sori-input:focus {
      outline: none;
      border-color: ${primaryColor};
    }

    .sori-submit {
      width: 100%;
      padding: 12px;
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: ${resolveBorderRadius(borderRadius === "full" ? "lg" : borderRadius)};
      font-weight: 500;
      font-size: ${fontSizeValue};
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .sori-submit:hover {
      opacity: 0.9;
    }

    .sori-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sori-success {
      text-align: center;
      padding: 24px 16px;
      color: #059669;
    }

    .sori-success svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
    }
  `;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getStyles(theme, position, zIndex) instead
 */
export function getStylesLegacy(
  primaryColor: string,
  position: Position,
  zIndex: number
): string {
  const legacyTheme: ThemeStyles = {
    primaryColor,
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
  };
  return getStyles(legacyTheme, position, zIndex);
}

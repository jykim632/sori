import type { Position } from "./types";

export function getStyles(primaryColor: string, position: Position, zIndex: number): string {
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    }

    .sori-trigger {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .sori-trigger:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .sori-trigger svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .sori-panel {
      position: absolute;
      ${position.includes("bottom") ? "bottom: 70px;" : "top: 70px;"}
      ${position.includes("right") ? "right: 0;" : "left: 0;"}
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
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
      border-bottom: 1px solid #e5e7eb;
    }

    .sori-greeting {
      font-weight: 600;
      color: #111827;
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
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s;
    }

    .sori-type-btn:hover {
      border-color: ${primaryColor};
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
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      resize: vertical;
      font-family: inherit;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .sori-textarea:focus {
      outline: none;
      border-color: ${primaryColor};
    }

    .sori-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      margin-bottom: 12px;
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
      border-radius: 8px;
      font-weight: 500;
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

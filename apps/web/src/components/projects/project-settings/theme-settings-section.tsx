import { useState } from "react";
import { Palette } from "lucide-react";
import type { WidgetConfig, ThemeStyles, ThemePreset, SizeToken, BorderRadiusToken, ShadowToken } from "./types";
import { THEME_PRESETS } from "./types";

type Props = {
  config: WidgetConfig;
  resolvedTheme: ThemeStyles;
  onPresetChange: (preset: ThemePreset) => void;
  onStyleChange: (key: keyof ThemeStyles, value: string) => void;
  onConfigChange: (key: keyof WidgetConfig, value: string) => void;
};

export function ThemeSettingsSection({
  config,
  resolvedTheme,
  onPresetChange,
  onStyleChange,
  onConfigChange,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      {/* Theme Presets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5" />
          테마 선택
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {(["default", "minimal", "rounded"] as ThemePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => onPresetChange(preset)}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.preset === preset
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className="w-full h-20 rounded-lg mb-3 flex items-end justify-end p-2"
                style={{ backgroundColor: THEME_PRESETS[preset].backgroundColor }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: THEME_PRESETS[preset].primaryColor,
                    borderRadius: preset === "rounded" ? "50%" : preset === "minimal" ? "4px" : "8px",
                  }}
                >
                  <span className="text-white text-xs">+</span>
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900 capitalize">{preset}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {preset === "default" && "기본 스타일"}
                  {preset === "minimal" && "미니멀 스타일"}
                  {preset === "rounded" && "둥근 스타일"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Basic Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">기본 설정</h2>
        <div className="space-y-4">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메인 색상
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={resolvedTheme.primaryColor}
                onChange={(e) => onStyleChange("primaryColor", e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={resolvedTheme.primaryColor}
                onChange={(e) => onStyleChange("primaryColor", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">위치</label>
            <div className="grid grid-cols-2 gap-2">
              {(["bottom-right", "bottom-left", "top-right", "top-left"] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => onConfigChange("position", pos)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    (config.position || "bottom-right") === pos
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {pos === "bottom-right" && "우하단"}
                  {pos === "bottom-left" && "좌하단"}
                  {pos === "top-right" && "우상단"}
                  {pos === "top-left" && "좌상단"}
                </button>
              ))}
            </div>
          </div>

          {/* Greeting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">인사말</label>
            <input
              type="text"
              value={config.greeting || ""}
              onChange={(e) => onConfigChange("greeting", e.target.value)}
              placeholder="무엇을 도와드릴까요?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Locale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">언어</label>
            <div className="flex gap-2">
              {(["ko", "en"] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => onConfigChange("locale", loc)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    (config.locale || "ko") === loc
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {loc === "ko" ? "한국어" : "English"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-semibold text-gray-900">고급 설정</h2>
          <span className={`text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {showAdvanced && (
          <div className="p-6 pt-0 border-t border-gray-100 space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">글자 크기</label>
              <div className="flex gap-2">
                {(["sm", "md", "lg"] as SizeToken[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => onStyleChange("fontSize", size)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      resolvedTheme.fontSize === size
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {size === "sm" && "작게"}
                    {size === "md" && "보통"}
                    {size === "lg" && "크게"}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">버튼 크기</label>
              <div className="flex gap-2">
                {(["sm", "md", "lg"] as SizeToken[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => onStyleChange("triggerSize", size)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      resolvedTheme.triggerSize === size
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {size === "sm" && "작게 (40px)"}
                    {size === "md" && "보통 (56px)"}
                    {size === "lg" && "크게 (72px)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">패널 너비</label>
              <div className="flex gap-2">
                {(["sm", "md", "lg"] as SizeToken[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => onStyleChange("panelWidth", size)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      resolvedTheme.panelWidth === size
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {size === "sm" && "좁게 (280px)"}
                    {size === "md" && "보통 (320px)"}
                    {size === "lg" && "넓게 (400px)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">모서리 둥글기</label>
              <div className="flex flex-wrap gap-2">
                {(["none", "sm", "md", "lg", "full"] as BorderRadiusToken[]).map((radius) => (
                  <button
                    key={radius}
                    onClick={() => onStyleChange("borderRadius", radius)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      resolvedTheme.borderRadius === radius
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {radius === "none" && "없음"}
                    {radius === "sm" && "약간"}
                    {radius === "md" && "보통"}
                    {radius === "lg" && "많이"}
                    {radius === "full" && "완전"}
                  </button>
                ))}
              </div>
            </div>

            {/* Shadow */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">그림자</label>
              <div className="flex gap-2">
                {(["none", "sm", "md", "lg"] as ShadowToken[]).map((shadow) => (
                  <button
                    key={shadow}
                    onClick={() => onStyleChange("shadow", shadow)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      resolvedTheme.shadow === shadow
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {shadow === "none" && "없음"}
                    {shadow === "sm" && "약함"}
                    {shadow === "md" && "보통"}
                    {shadow === "lg" && "강함"}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">배경 색상</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={resolvedTheme.backgroundColor}
                  onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={resolvedTheme.backgroundColor}
                  onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">텍스트 색상</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={resolvedTheme.textColor}
                  onChange={(e) => onStyleChange("textColor", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={resolvedTheme.textColor}
                  onChange={(e) => onStyleChange("textColor", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

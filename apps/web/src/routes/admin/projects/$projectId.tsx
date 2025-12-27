import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getProjectById, updateProject, generateApiKey, revokeApiKey, deleteProject } from "@/server/projects";
import { getSession } from "@/server/auth";
import { ArrowLeft, Check, Palette, Save, RotateCcw, Eye, Key, Copy, RefreshCw, Trash2, EyeOff, AlertTriangle, Settings, Globe } from "lucide-react";

type ThemePreset = "default" | "minimal" | "rounded";
type SizeToken = "sm" | "md" | "lg";
type BorderRadiusToken = "none" | "sm" | "md" | "lg" | "full";
type ShadowToken = "none" | "sm" | "md" | "lg";

interface ThemeStyles {
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

interface WidgetConfig {
  preset: ThemePreset;
  styles?: Partial<ThemeStyles>;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  greeting?: string;
  locale?: "ko" | "en";
}

const THEME_PRESETS: Record<ThemePreset, ThemeStyles> = {
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

export const Route = createFileRoute("/admin/projects/$projectId")({
  component: ProjectSettingsPage,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  loader: async ({ params }) => {
    const project = await getProjectById({ data: { id: params.projectId } });
    if (!project) {
      throw redirect({ to: "/admin" });
    }
    return { project };
  },
});

function ProjectSettingsPage() {
  const { project } = Route.useLoaderData();
  const router = useRouter();

  // Initialize config from project or default
  const initialConfig: WidgetConfig = (project.widgetConfig as WidgetConfig) || {
    preset: "default",
  };

  const [config, setConfig] = useState<WidgetConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Basic info state
  const [projectName, setProjectName] = useState(project.name);
  const [allowedOrigins, setAllowedOrigins] = useState(
    (project.allowedOrigins as string[])?.join("\n") || ""
  );
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [basicInfoSaved, setBasicInfoSaved] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>((project as { apiKey?: string | null }).apiKey || null);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateApiKey = async () => {
    setApiKeyLoading(true);
    try {
      const result = await generateApiKey({ data: { projectId: project.id } });
      setApiKey(result.apiKey);
      setShowNewKey(result.apiKey); // 새로 생성된 키는 한 번만 전체 표시
    } catch (error) {
      console.error("Failed to generate API key:", error);
      alert("API 키 생성에 실패했습니다.");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleRevokeApiKey = async () => {
    setApiKeyLoading(true);
    try {
      await revokeApiKey({ data: { projectId: project.id } });
      setApiKey(null);
      setShowRevokeConfirm(false);
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      alert("API 키 삭제에 실패했습니다.");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return key.slice(0, 12) + "••••••••••••••••••••";
  };

  const handleSaveBasicInfo = async () => {
    if (!projectName.trim()) return;

    setSavingBasicInfo(true);
    try {
      await updateProject({
        data: {
          id: project.id,
          name: projectName.trim(),
          allowedOrigins: allowedOrigins
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
        },
      });
      setBasicInfoSaved(true);
      setTimeout(() => setBasicInfoSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save basic info:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSavingBasicInfo(false);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmName !== project.name) return;

    setDeleting(true);
    try {
      await deleteProject({ data: { id: project.id } });
      router.navigate({ to: "/admin", search: { tab: "projects" } });
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("프로젝트 삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  // Get resolved theme (preset + custom overrides)
  const resolvedTheme: ThemeStyles = {
    ...THEME_PRESETS[config.preset],
    ...(config.styles || {}),
  };

  const handlePresetChange = (preset: ThemePreset) => {
    setConfig({ ...config, preset, styles: undefined });
    setSaved(false);
  };

  const handleStyleChange = (key: keyof ThemeStyles, value: string) => {
    setConfig({
      ...config,
      styles: {
        ...(config.styles || {}),
        [key]: value,
      },
    });
    setSaved(false);
  };

  const handleConfigChange = (key: keyof WidgetConfig, value: string) => {
    setConfig({ ...config, [key]: value });
    setSaved(false);
  };

  const handleReset = () => {
    setConfig({ preset: "default" });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject({
        data: {
          id: project.id,
          widgetConfig: config,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                search={{ tab: "projects" }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500">위젯 설정</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                초기화
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                기본 정보
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    프로젝트 이름
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="My Project"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      허용 도메인
                    </span>
                  </label>
                  <textarea
                    value={allowedOrigins}
                    onChange={(e) => setAllowedOrigins(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder={"https://myapp.com\nhttps://*.myapp.com"}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    한 줄에 하나씩 입력하세요. 비워두면 모든 도메인에서 위젯을 사용할 수 있습니다.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveBasicInfo}
                    disabled={savingBasicInfo || !projectName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {basicInfoSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {savingBasicInfo ? "저장 중..." : basicInfoSaved ? "저장됨" : "저장"}
                  </button>
                </div>
              </div>
            </div>

            {/* API Key Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                API 키
              </h2>

              {showNewKey && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 mb-2">
                        API 키가 생성되었습니다!
                      </p>
                      <p className="text-xs text-green-700 mb-3">
                        이 키는 한 번만 표시됩니다. 지금 복사해두세요.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono break-all">
                          {showNewKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(showNewKey)}
                          className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => setShowNewKey(null)}
                        className="mt-3 text-sm text-green-700 hover:text-green-800"
                      >
                        확인했습니다
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {apiKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">API Key</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => copyToClipboard(apiKey)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                          title="복사"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                          title={apiKeyRevealed ? "숨기기" : "보기"}
                        >
                          {apiKeyRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <code className="font-mono text-sm text-gray-800 break-all">
                      {apiKeyRevealed ? apiKey : maskApiKey(apiKey)}
                    </code>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateApiKey}
                      disabled={apiKeyLoading}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
                      키 재발급
                    </button>
                    <button
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={apiKeyLoading}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      키 삭제
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    API 사용법: <code className="bg-gray-100 px-1 py-0.5 rounded">Authorization: Bearer {maskApiKey(apiKey)}</code>
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Key className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">API 키가 없습니다.</p>
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={apiKeyLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {apiKeyLoading ? "생성 중..." : "API 키 발급"}
                  </button>
                </div>
              )}

              {/* Revoke Confirmation Modal */}
              {showRevokeConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">API 키를 삭제하시겠습니까?</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          이 작업은 되돌릴 수 없습니다. 기존 키를 사용하는 모든 API 호출이 즉시 실패합니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowRevokeConfirm(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleRevokeApiKey}
                        disabled={apiKeyLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {apiKeyLoading ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Project Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">프로젝트를 삭제하시겠습니까?</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          이 작업은 되돌릴 수 없습니다. 프로젝트와 연결된 모든 피드백 데이터가 영구적으로 삭제됩니다.
                        </p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        확인을 위해 프로젝트 이름 <span className="font-semibold text-red-600">{project.name}</span>을 입력하세요
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder={project.name}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmName("");
                        }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleDeleteProject}
                        disabled={deleting || deleteConfirmName !== project.name}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deleting ? "삭제 중..." : "영구 삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                    onClick={() => handlePresetChange(preset)}
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
                      onChange={(e) => handleStyleChange("primaryColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={resolvedTheme.primaryColor}
                      onChange={(e) => handleStyleChange("primaryColor", e.target.value)}
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
                        onClick={() => handleConfigChange("position", pos)}
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
                    onChange={(e) => handleConfigChange("greeting", e.target.value)}
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
                        onClick={() => handleConfigChange("locale", loc)}
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
                          onClick={() => handleStyleChange("fontSize", size)}
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
                          onClick={() => handleStyleChange("triggerSize", size)}
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
                          onClick={() => handleStyleChange("panelWidth", size)}
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
                          onClick={() => handleStyleChange("borderRadius", radius)}
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
                          onClick={() => handleStyleChange("shadow", shadow)}
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
                        onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={resolvedTheme.backgroundColor}
                        onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
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
                        onChange={(e) => handleStyleChange("textColor", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={resolvedTheme.textColor}
                        onChange={(e) => handleStyleChange("textColor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <h2 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                위험 영역
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">프로젝트 삭제</h3>
                    <p className="text-sm text-gray-500">
                      프로젝트와 모든 피드백 데이터가 영구적으로 삭제됩니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                미리보기
              </h2>
              <div
                className="relative rounded-xl overflow-hidden"
                style={{ backgroundColor: "#f9fafb", minHeight: "400px" }}
              >
                {/* Preview Widget */}
                <WidgetPreview theme={resolvedTheme} position={config.position || "bottom-right"} greeting={config.greeting} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Widget Preview Component
function WidgetPreview({
  theme,
  position,
  greeting,
}: {
  theme: ThemeStyles;
  position: string;
  greeting?: string;
}) {
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

import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getProjectById, updateProject } from "@/server/projects";
import { ArrowLeft, Check, Save, RotateCcw, Eye } from "lucide-react";
import { NotificationSettings } from "@/components/projects/notification-settings";
import {
  WidgetPreview,
  ApiKeySection,
  BasicInfoSection,
  ThemeSettingsSection,
  DangerZoneSection,
  THEME_PRESETS,
  type WidgetConfig,
  type ThemeStyles,
  type ThemePreset,
  type ProjectType,
} from "@/components/projects/project-settings";

export const Route = createFileRoute("/$orgSlug/admin/projects/$projectId")({
  component: ProjectSettingsPage,
  loader: async ({ params }) => {
    const project = await getProjectById({ data: { id: params.projectId } }) as ProjectType | null;
    if (!project) {
      throw redirect({
        to: "/$orgSlug/admin/projects",
        params: { orgSlug: params.orgSlug },
      });
    }
    return { project };
  },
});

function ProjectSettingsPage() {
  const { project } = Route.useLoaderData();
  const { orgSlug } = Route.useParams();
  const router = useRouter();

  // Theme config state (parent owns because Save/Reset need it)
  const initialConfig: WidgetConfig = (project.widgetConfig as WidgetConfig) || {
    preset: "default",
  };

  const [config, setConfig] = useState<WidgetConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      alert(error instanceof Error ? error.message : "저장에 실패했습니다.");
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
                to="/$orgSlug/admin/projects"
                params={{ orgSlug }}
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
            <BasicInfoSection
              projectId={project.id}
              initialName={project.name}
              initialAllowedOrigins={project.allowedOrigins as string[]}
            />

            <ApiKeySection
              projectId={project.id}
              initialApiKey={(project as { apiKey?: string | null }).apiKey || null}
            />

            <NotificationSettings projectId={project.id} />

            <ThemeSettingsSection
              config={config}
              resolvedTheme={resolvedTheme}
              onPresetChange={handlePresetChange}
              onStyleChange={handleStyleChange}
              onConfigChange={handleConfigChange}
            />

            <DangerZoneSection
              projectId={project.id}
              projectName={project.name}
              onDeleteSuccess={() => router.navigate({
                to: "/$orgSlug/admin/projects",
                params: { orgSlug },
              })}
            />
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
                <WidgetPreview theme={resolvedTheme} position={config.position || "bottom-right"} greeting={config.greeting} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

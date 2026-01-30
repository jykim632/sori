import { useState } from "react";
import { Settings, Globe, Save, Check } from "lucide-react";
import { updateProject } from "@/server/projects";

type Props = {
  projectId: string;
  initialName: string;
  initialAllowedOrigins: string[];
};

export function BasicInfoSection({ projectId, initialName, initialAllowedOrigins }: Props) {
  const [projectName, setProjectName] = useState(initialName);
  const [allowedOrigins, setAllowedOrigins] = useState(
    initialAllowedOrigins?.join("\n") || ""
  );
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [basicInfoSaved, setBasicInfoSaved] = useState(false);

  const handleSaveBasicInfo = async () => {
    if (!projectName.trim()) return;

    setSavingBasicInfo(true);
    try {
      await updateProject({
        data: {
          id: projectId,
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
      alert(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSavingBasicInfo(false);
    }
  };

  return (
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
  );
}

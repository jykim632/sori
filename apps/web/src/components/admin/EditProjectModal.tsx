import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  project: { id: string; name: string; allowedOrigins: string[] };
  onClose: () => void;
  onSave: (id: string, name: string, allowedOrigins: string[]) => Promise<void>;
};

export function EditProjectModal({ project, onClose, onSave }: Props) {
  const [name, setName] = useState(project.name);
  const [origins, setOrigins] = useState(project.allowedOrigins.join("\n"));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const allowedOrigins = origins
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      await onSave(project.id, name.trim(), allowedOrigins);
      onClose();
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("프로젝트 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md lg:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">프로젝트 수정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="My Project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              허용 도메인 <span className="text-gray-400 font-normal">(한 줄에 하나씩)</span>
            </label>
            <textarea
              value={origins}
              onChange={(e) => setOrigins(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={4}
              placeholder={"https://myapp.com\nhttps://*.myapp.com"}
            />
            <p className="mt-1 text-xs text-gray-500">비워두면 모든 도메인 허용</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

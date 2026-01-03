import { useState } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  project: { id: string; name: string };
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
};

export function DeleteProjectModal({ project, onClose, onDelete }: Props) {
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== project.name) return;

    setDeleting(true);
    try {
      await onDelete(project.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("프로젝트 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">프로젝트를 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mt-1">
              이 작업은 되돌릴 수 없습니다. 프로젝트와 연결된 모든 피드백 데이터가 영구적으로
              삭제됩니다.
            </p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            확인을 위해 프로젝트 이름{" "}
            <span className="font-semibold text-red-600">{project.name}</span>을 입력하세요
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder={project.name}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirmName !== project.name}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? "삭제 중..." : "영구 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

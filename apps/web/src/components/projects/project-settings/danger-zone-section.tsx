import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteProject } from "@/server/projects";

type Props = {
  projectId: string;
  projectName: string;
  onDeleteSuccess: () => void;
};

/**
 * Render a danger-zone UI that allows a user to permanently delete a project.
 *
 * Displays a card with a "Delete" action that opens a confirmation modal requiring the user to type the exact `projectName` before the permanent delete action is enabled. When deletion is confirmed, the component performs the deletion for `projectId`, shows a loading state while the operation is in progress, and invokes `onDeleteSuccess` after a successful deletion.
 *
 * @param projectId - The identifier of the project to delete
 * @param projectName - The exact project name the user must enter to confirm deletion
 * @param onDeleteSuccess - Callback invoked after the project is successfully deleted
 * @returns The danger zone React element with a conditional confirmation modal
 */
export function DangerZoneSection({ projectId, projectName, onDeleteSuccess }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (deleteConfirmName !== projectName) return;

    setDeleting(true);
    try {
      await deleteProject({ data: { id: projectId } });
      onDeleteSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : "프로젝트 삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  return (
    <>
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
                확인을 위해 프로젝트 이름 <span className="font-semibold text-red-600">{projectName}</span>을 입력하세요
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={projectName}
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
                disabled={deleting || deleteConfirmName !== projectName}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "삭제 중..." : "영구 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
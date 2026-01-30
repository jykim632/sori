import { Mail, Check, RotateCcw } from "lucide-react";
import type { Column } from "@/components/DataTable";
import type { FeedbackWithProject } from "./types";
import { getTypeIcon, getTypeLabel, getStatusLabel } from "./utils";

/**
 * Create column definitions for the admin feedback data table.
 *
 * The returned columns render status, type, message, project, date, and actions
 * for each feedback row. The actions column renders a toggle button that stops
 * event propagation and invokes `onUpdateStatus` with the feedback id and its
 * current status.
 *
 * @param onUpdateStatus - Callback invoked when the row action button is clicked; receives the feedback `id` and the row's current status.
 * @returns An array of Column<FeedbackWithProject> describing the table's columns.
 */
export function createFeedbackColumns(
  onUpdateStatus: (id: string, currentStatus: string) => void,
): Column<FeedbackWithProject>[] {
  return [
    {
      key: "status",
      header: "상태",
      render: (feedback) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            feedback.status === "OPEN"
              ? "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
              : feedback.status === "IN_PROGRESS"
                ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                : feedback.status === "RESOLVED"
                  ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                  : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20"
          }`}
        >
          {getStatusLabel(feedback.status)}
        </span>
      ),
    },
    {
      key: "type",
      header: "유형",
      render: (feedback) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            feedback.type === "BUG"
              ? "text-red-600"
              : feedback.type === "FEATURE"
                ? "text-purple-600"
                : "text-blue-600"
          }`}
        >
          {getTypeIcon(feedback.type)}
          <span className="hidden sm:inline">{getTypeLabel(feedback.type)}</span>
        </span>
      ),
    },
    {
      key: "message",
      header: "내용",
      cellClassName: "max-w-md",
      render: (feedback) => (
        <div>
          <p
            className="text-sm text-gray-900 font-medium line-clamp-2"
            title={feedback.message}
          >
            {feedback.message}
          </p>
          {feedback.email && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {feedback.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "project",
      header: "프로젝트",
      render: (feedback) => (
        <span className="text-sm text-gray-500">{feedback.project?.name}</span>
      ),
    },
    {
      key: "date",
      header: "날짜",
      render: (feedback) => {
        const date = new Date(feedback.createdAt);
        return (
          <div className="text-sm text-gray-400">
            <div>{date.toLocaleDateString("ko-KR")}</div>
            <div className="text-xs">{date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "작업",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (feedback) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus(feedback.id, feedback.status);
          }}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            feedback.status === "OPEN"
              ? "text-green-600 hover:bg-green-50"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          title={feedback.status === "OPEN" ? "완료 처리" : "다시 열기"}
        >
          {feedback.status === "OPEN" ? (
            <Check className="w-4 h-4" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </button>
      ),
    },
  ];
}
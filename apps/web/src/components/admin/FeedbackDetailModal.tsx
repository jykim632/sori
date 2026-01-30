import { useState } from "react";
import { X, Mail, Clock, Globe, ExternalLink, Link2, Check } from "lucide-react";
import { getTypeIcon, getTypeLabel, getStatusLabel } from "./utils";
import { FeedbackRepliesSection } from "./feedback-replies-section";
import type { FeedbackWithProject, FeedbackMetadata } from "./types";

type Props = {
  feedback: FeedbackWithProject;
  onClose: () => void;
  onStatusChange: (id: string, currentStatus: string) => void;
};

/**
 * Render a modal that shows detailed information for a feedback item and provides controls for status updates, copying a customer ticket link, and viewing replies.
 *
 * Displays the feedback type and project, message content, email, creation date, optional metadata (URL and user agent), an optional customer ticket link with a copy action, and a replies section. Provides buttons to change the feedback status and to close the modal.
 *
 * @param feedback - The feedback record to display, including project, message, email, createdAt, token, status, type, and optional metadata.
 * @param onClose - Callback invoked when the modal should be closed (backdrop click, header close button, or footer close button).
 * @param onStatusChange - Callback invoked with the feedback `id` and current `status` when the user requests a status change.
 * @returns The feedback detail modal element.
 */
export function FeedbackDetailModal({ feedback, onClose, onStatusChange }: Props) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyTicketLink = async () => {
    if (!feedback.token) return;

    const ticketUrl = `${window.location.origin}/f/${feedback.token}`;
    try {
      await navigator.clipboard.writeText(ticketUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const metadata = feedback.metadata as FeedbackMetadata | null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                feedback.type === "BUG"
                  ? "bg-red-100 text-red-600"
                  : feedback.type === "FEATURE"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-blue-100 text-blue-600"
              }`}
            >
              {getTypeIcon(feedback.type)}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{getTypeLabel(feedback.type)}</h2>
              <p className="text-sm text-gray-500">{feedback.project?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Status */}
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                feedback.status === "OPEN"
                  ? "bg-yellow-100 text-yellow-800"
                  : feedback.status === "IN_PROGRESS"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {getStatusLabel(feedback.status)}
            </span>
            <button
              onClick={() => {
                onStatusChange(feedback.id, feedback.status);
                onClose();
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {feedback.status === "OPEN" ? "처리 완료로 변경" : "다시 열기"}
            </button>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">메시지</h3>
            <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
              {feedback.message}
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">이메일:</span>
              <span className="text-gray-900">{feedback.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">등록일:</span>
              <span className="text-gray-900">
                {new Date(feedback.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
          </div>

          {/* Customer Ticket Link */}
          {feedback.token && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
              <Link2 className="w-4 h-4 text-indigo-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-900">고객 확인 링크</p>
                <p className="text-xs text-indigo-600 truncate">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/f/${feedback.token}`}
                </p>
              </div>
              <button
                onClick={handleCopyTicketLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    링크 복사
                  </>
                )}
              </button>
            </div>
          )}

          {/* Metadata */}
          {metadata && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">메타데이터</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                {metadata.url && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-gray-500">URL: </span>
                      <a
                        href={metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline break-all"
                      >
                        {metadata.url}
                        <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    </div>
                  </div>
                )}
                {metadata.userAgent && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500">User Agent: </span>
                    <span className="text-gray-700 break-all">{metadata.userAgent}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Replies Section */}
          <FeedbackRepliesSection feedbackId={feedback.id} feedbackEmail={feedback.email} />
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
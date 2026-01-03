import { useState, useEffect } from "react";
import { X, Mail, Clock, Globe, ExternalLink, MessageCircle, Lock, Trash2, Send } from "lucide-react";
import { createReply, getReplies, deleteReply as deleteReplyFn } from "@/server/reply";
import { getTypeIcon, getTypeLabel, getStatusLabel, getAuthorTypeLabel } from "./utils";
import type { FeedbackWithProject, Reply, FeedbackMetadata } from "./types";

type Props = {
  feedback: FeedbackWithProject;
  onClose: () => void;
  onStatusChange: (id: string, currentStatus: string) => void;
};

export function FeedbackDetailModal({ feedback, onClose, onStatusChange }: Props) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReplyContent, setNewReplyContent] = useState("");
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [creatingReply, setCreatingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  useEffect(() => {
    const loadReplies = async () => {
      try {
        const feedbackReplies = await getReplies({ data: { feedbackId: feedback.id } });
        setReplies(feedbackReplies as Reply[]);
      } catch (error) {
        console.error("Failed to load replies:", error);
      } finally {
        setLoadingReplies(false);
      }
    };
    loadReplies();
  }, [feedback.id]);

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim()) return;

    setCreatingReply(true);
    try {
      const newReply = await createReply({
        data: {
          feedbackId: feedback.id,
          content: newReplyContent.trim(),
          isInternal: isInternalReply,
        },
      });
      setReplies([...replies, newReply as Reply]);
      setNewReplyContent("");
      setIsInternalReply(false);
    } catch (error) {
      console.error("Failed to create reply:", error);
      alert("답변 등록에 실패했습니다.");
    } finally {
      setCreatingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("정말 이 답변을 삭제하시겠습니까?")) return;

    setDeletingReplyId(replyId);
    try {
      await deleteReplyFn({ data: { id: replyId } });
      setReplies(replies.filter((r) => r.id !== replyId));
    } catch (error) {
      console.error("Failed to delete reply:", error);
      alert("답변 삭제에 실패했습니다.");
    } finally {
      setDeletingReplyId(null);
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
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-500">답변 ({replies.length})</h3>
            </div>

            {loadingReplies ? (
              <div className="text-center py-4 text-gray-400">답변 로딩 중...</div>
            ) : replies.length === 0 ? (
              <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg">
                아직 답변이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-lg ${
                      reply.isInternal ? "bg-amber-50 border border-amber-100" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {reply.authorName || "익명"}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              reply.authorType === "ADMIN"
                                ? "bg-indigo-100 text-indigo-700"
                                : reply.authorType === "API"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getAuthorTypeLabel(reply.authorType)}
                          </span>
                          {reply.isInternal && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <Lock className="w-3 h-3" />
                              내부 메모
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{reply.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(reply.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      {reply.authorType === "ADMIN" && (
                        <button
                          onClick={() => handleDeleteReply(reply.id)}
                          disabled={deletingReplyId === reply.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Reply Form */}
            <form onSubmit={handleCreateReply} className="mt-4 space-y-3">
              <textarea
                value={newReplyContent}
                onChange={(e) => setNewReplyContent(e.target.value)}
                placeholder="답변을 입력하세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalReply}
                    onChange={(e) => setIsInternalReply(e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>내부 메모 (API에 노출되지 않음)</span>
                </label>
                <button
                  type="submit"
                  disabled={creatingReply || !newReplyContent.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {creatingReply ? "등록 중..." : "답변 등록"}
                </button>
              </div>
            </form>
          </div>
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

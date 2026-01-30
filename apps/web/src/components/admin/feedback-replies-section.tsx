import { useState, useEffect } from "react";
import { MessageCircle, Lock, Trash2, Send, Mail } from "lucide-react";
import { createReply, getReplies, deleteReply as deleteReplyFn } from "@/server/reply";
import { getAuthorTypeLabel } from "./utils";
import type { Reply } from "./types";

type Props = {
  feedbackId: string;
  feedbackEmail: string | null;
};

/**
 * Render and manage the replies section for a feedback item.
 *
 * Displays existing replies, allows creating new replies (as internal memo or customer-facing with an optional email notification), and enables deletion of admin replies. Loads replies when `feedbackId` changes and manages loading, creating, and deleting states.
 *
 * @param feedbackId - The feedback item's ID whose replies are displayed and managed
 * @param feedbackEmail - The customer's email used to enable the "notify by email" option; `null` disables email notifications
 * @returns The React element that renders the feedback replies UI
 */
export function FeedbackRepliesSection({ feedbackId, feedbackEmail }: Props) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReplyContent, setNewReplyContent] = useState("");
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [sendEmail, setSendEmail] = useState(true); // 기본값: 이메일 발송
  const [creatingReply, setCreatingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  useEffect(() => {
    const loadReplies = async () => {
      try {
        const feedbackReplies = await getReplies({ data: { feedbackId } });
        setReplies(feedbackReplies as Reply[]);
      } catch (error) {
        console.error("Failed to load replies:", error);
      } finally {
        setLoadingReplies(false);
      }
    };
    loadReplies();
  }, [feedbackId]);

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim()) return;

    setCreatingReply(true);
    try {
      const newReply = await createReply({
        data: {
          feedbackId,
          content: newReplyContent.trim(),
          isInternal: isInternalReply,
          sendEmail: sendEmail && !isInternalReply && !!feedbackEmail,
        },
      });
      setReplies([...replies, newReply as Reply]);
      setNewReplyContent("");
      setIsInternalReply(false);
      setSendEmail(true);
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

  return (
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternalReply}
                onChange={(e) => {
                  setIsInternalReply(e.target.checked);
                  if (e.target.checked) setSendEmail(false);
                }}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <Lock className="w-4 h-4 text-amber-600" />
              <span>내부 메모</span>
            </label>
            {feedbackEmail && !isInternalReply && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Mail className="w-4 h-4 text-blue-600" />
                <span>고객에게 이메일 알림</span>
              </label>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creatingReply || !newReplyContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {creatingReply ? "등록 중..." : "답변 등록"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
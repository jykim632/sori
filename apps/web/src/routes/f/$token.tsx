import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

// Types
interface Reply {
  id: string;
  content: string;
  authorName: string;
  authorType: "CUSTOMER" | "ADMIN" | "API";
  createdAt: string;
}

interface TicketData {
  feedback: {
    id: string;
    type: string;
    message: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  };
  project: {
    id: string;
    name: string;
  };
  replies: Reply[];
  canReply: boolean;
}

interface ErrorState {
  status: number;
  message: string;
}

export const Route = createFileRoute("/f/$token")({
  component: TicketPage,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});

function TicketPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<TicketData | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch ticket data
  useEffect(() => {
    async function fetchTicket() {
      try {
        const response = await fetch(`/api/v1/tickets/${token}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError({
            status: response.status,
            message: errorData.error || getErrorMessage(response.status),
          });
          return;
        }

        const ticketData = await response.json();
        setData(ticketData);
      } catch (err) {
        setError({
          status: 500,
          message: "연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [token]);

  // Submit reply
  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();

    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/v1/tickets/${token}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "메시지 전송에 실패했습니다.");
      }

      const newReply = await response.json();

      // Add the new reply to the list
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          replies: [
            ...prev.replies,
            {
              id: newReply.id,
              content: replyContent.trim(),
              authorName: "나",
              authorType: "CUSTOMER",
              createdAt: newReply.createdAt,
            },
          ],
        };
      });

      setReplyContent("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "메시지 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorPage status={error.status} message={error.message} />;
  }

  // No data
  if (!data) {
    return <ErrorPage status={404} message="문의를 찾을 수 없습니다." />;
  }

  const isClosed = ["RESOLVED", "CLOSED"].includes(data.feedback.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {data.project.name}
          </h1>
          <p className="text-sm text-gray-500">문의 내역</p>
        </div>
      </header>

      {/* Closed notice */}
      {isClosed && (
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              이 문의는 종료되었습니다. 추가 문의가 필요하시면 새로 작성해주세요.
            </p>
          </div>
        </div>
      )}

      {/* Conversation */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Original feedback */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getTypeStyle(data.feedback.type)}`}>
              {getTypeLabel(data.feedback.type)}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(data.feedback.createdAt)}
            </span>
          </div>
          <p className="text-gray-900 whitespace-pre-wrap">{escapeHtml(data.feedback.message)}</p>
        </div>

        {/* Replies */}
        {data.replies.map((reply) => (
          <div
            key={reply.id}
            className={`rounded-lg shadow-sm border p-4 ${
              reply.authorType === "CUSTOMER"
                ? "bg-blue-50 border-blue-200 ml-8"
                : "bg-white mr-8"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-900">
                {reply.authorType === "CUSTOMER" ? "나" : reply.authorName || "담당자"}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(reply.createdAt)}
              </span>
            </div>
            <p className="text-gray-900 whitespace-pre-wrap">{escapeHtml(reply.content)}</p>
          </div>
        ))}
      </main>

      {/* Reply form */}
      {data.canReply && !isClosed && (
        <footer className="sticky bottom-0 bg-white border-t">
          <form onSubmit={handleSubmitReply} className="max-w-2xl mx-auto px-4 py-4">
            {submitError && (
              <div className="mb-3 text-sm text-red-600">{submitError}</div>
            )}
            <div className="flex gap-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="추가 메시지를 입력하세요..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                maxLength={5000}
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={!replyContent.trim() || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "전송 중..." : "보내기"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {replyContent.length}/5000자
            </p>
          </form>
        </footer>
      )}
    </div>
  );
}

// Error page component
function ErrorPage({ status, message }: { status: number; message: string }) {
  const titles: Record<number, string> = {
    400: "잘못된 요청",
    404: "찾을 수 없음",
    410: "링크 만료",
    429: "요청 제한",
    500: "서버 오류",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">{status}</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {titles[status] || "오류"}
        </h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <a
          href="/"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}

// Helper functions
function getErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "잘못된 링크입니다.",
    404: "문의를 찾을 수 없습니다.",
    410: "링크가 만료되었습니다.",
    429: "잠시 후 다시 시도해주세요.",
    500: "일시적인 오류가 발생했습니다.",
  };
  return messages[status] || "오류가 발생했습니다.";
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BUG: "버그 제보",
    INQUIRY: "문의",
    FEATURE: "기능 요청",
  };
  return labels[type] || type;
}

function getTypeStyle(type: string): string {
  const styles: Record<string, string> = {
    BUG: "bg-red-100 text-red-700",
    INQUIRY: "bg-blue-100 text-blue-700",
    FEATURE: "bg-green-100 text-green-700",
  };
  return styles[type] || "bg-gray-100 text-gray-700";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// XSS prevention
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

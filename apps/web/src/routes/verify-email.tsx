import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";

type SearchParams = {
  email?: string;
};

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;

    setResending(true);
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      }
    } catch (error) {
      console.error("Failed to resend verification email:", error);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            이메일을 확인해주세요
          </h1>

          <p className="text-gray-600 mb-6">
            {email ? (
              <>
                <span className="font-medium text-gray-900">{email}</span>
                <br />
                위 주소로 인증 메일을 발송했습니다.
              </>
            ) : (
              "입력하신 이메일 주소로 인증 메일을 발송했습니다."
            )}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600">
            <p className="mb-2">
              메일함에서 <strong>[Sori] 이메일 인증</strong> 제목의 메일을 찾아
              인증 버튼을 클릭해주세요.
            </p>
            <p className="text-gray-500">
              메일이 보이지 않으면 스팸함을 확인해주세요.
            </p>
          </div>

          {email && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
            >
              {resent ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">인증 메일 재발송 완료</span>
                </>
              ) : resending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  인증 메일 다시 보내기
                </>
              )}
            </button>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

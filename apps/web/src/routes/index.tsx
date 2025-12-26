import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight">Sori</h1>
        <p className="text-xl text-indigo-100">
          가장 가벼운 피드백 위젯. 스크립트 한 줄로 시작하세요.
        </p>

        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/signup"
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
          >
            시작하기
          </a>
          <a
            href="/guide"
            className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
          >
            사용 가이드
          </a>
        </div>

        <div className="pt-8">
          <a
            href="/login"
            className="text-indigo-200 hover:text-white transition-colors"
          >
            이미 계정이 있으신가요? 로그인
          </a>
        </div>
      </div>
    </div>
  );
}

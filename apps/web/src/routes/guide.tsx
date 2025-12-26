import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, ChevronRight, MessageSquare, Code, Palette, Globe, Zap } from "lucide-react";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
});

function GuidePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const basicCode = `<script src="https://sori.io/api/v1/widget" data-project-id="YOUR_PROJECT_ID"></script>`;

  const fullCode = `<script
  src="https://sori.io/api/v1/widget"
  data-project-id="YOUR_PROJECT_ID"
  data-position="bottom-right"
  data-color="#4f46e5"
  data-text="Feedback"
></script>`;

  const apiCode = `// JavaScript
fetch('https://sori.io/api/v1/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'YOUR_PROJECT_ID',
    type: 'BUG',  // BUG, INQUIRY, FEATURE
    message: '버그 내용...',
    email: 'user@example.com'
  })
});`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Sori</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                로그인
              </Link>
              <Link
                to="/signup"
                className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sori 사용 가이드
          </h1>
          <p className="text-xl text-gray-600">
            3분 만에 웹사이트에 피드백 위젯을 추가하세요
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Zap className="w-6 h-6 text-indigo-600" />
            빠른 시작
          </h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">계정 생성 및 프로젝트 만들기</h3>
                <p className="text-gray-600 mb-4">
                  <Link to="/signup" className="text-indigo-600 hover:underline">회원가입</Link> 후
                  조직과 프로젝트를 생성하세요. 프로젝트 생성 시 <strong>Project ID</strong>가 발급됩니다.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">위젯 코드 추가</h3>
                <p className="text-gray-600 mb-4">
                  웹사이트의 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">&lt;/body&gt;</code> 태그 앞에 아래 코드를 추가하세요.
                </p>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                    <span className="text-xs text-gray-400">HTML</span>
                    <button
                      onClick={() => copyCode(basicCode, "basic")}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                    >
                      {copiedId === "basic" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === "basic" ? "복사됨" : "복사"}
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                    <code>{basicCode}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">피드백 수집 시작</h3>
                <p className="text-gray-600">
                  웹사이트 우측 하단에 피드백 버튼이 나타납니다. 수집된 피드백은 <Link to="/admin" className="text-indigo-600 hover:underline">어드민 대시보드</Link>에서 확인하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Palette className="w-6 h-6 text-indigo-600" />
            위젯 커스터마이징
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 rounded-t-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                <span className="text-xs text-gray-400">HTML</span>
                <button
                  onClick={() => copyCode(fullCode, "full")}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  {copiedId === "full" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === "full" ? "복사됨" : "복사"}
                </button>
              </div>
              <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                <code>{fullCode}</code>
              </pre>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">설정 옵션 (data-* 속성)</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-mono text-indigo-600">data-project-id</div>
                  <div className="col-span-2 text-gray-600">
                    <span className="text-red-500">필수</span> - 어드민에서 발급받은 프로젝트 ID
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-mono text-indigo-600">data-position</div>
                  <div className="col-span-2 text-gray-600">
                    위젯 위치: <code className="px-1 bg-gray-100 rounded">bottom-right</code>, <code className="px-1 bg-gray-100 rounded">bottom-left</code>, <code className="px-1 bg-gray-100 rounded">top-right</code>, <code className="px-1 bg-gray-100 rounded">top-left</code>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-mono text-indigo-600">data-color</div>
                  <div className="col-span-2 text-gray-600">
                    테마 색상 (HEX 코드, 예: #4f46e5)
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-mono text-indigo-600">data-text</div>
                  <div className="col-span-2 text-gray-600">
                    버튼에 표시될 텍스트 (기본값: Feedback)
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-mono text-indigo-600">data-api-url</div>
                  <div className="col-span-2 text-gray-600">
                    API 서버 URL (자동 감지됨)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JavaScript API */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Code className="w-6 h-6 text-indigo-600" />
            JavaScript API
          </h2>

          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">위젯 제어</h3>
              <p className="text-gray-600 mb-4">JavaScript로 위젯을 프로그래밍 방식으로 제어할 수 있습니다.</p>
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-sm text-gray-300">
                  <code>{`// 위젯 열기
window.SoriWidget.open();

// 위젯 닫기
window.SoriWidget.close();`}</code>
                </pre>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">REST API 직접 호출</h3>
                <p className="text-gray-600 mb-4">
                  위젯 없이 API를 직접 호출하여 피드백을 수집할 수도 있습니다.
                </p>
              </div>
              <div className="bg-gray-900">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                  <span className="text-xs text-gray-400">JavaScript</span>
                  <button
                    onClick={() => copyCode(apiCode, "api")}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                  >
                    {copiedId === "api" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedId === "api" ? "복사됨" : "복사"}
                  </button>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                  <code>{apiCode}</code>
                </pre>
              </div>
              <div className="p-6 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">요청 파라미터</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="font-mono text-indigo-600">projectId</div>
                    <div className="text-gray-500">string</div>
                    <div className="text-red-500">필수</div>
                    <div className="text-gray-600">프로젝트 ID</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="font-mono text-indigo-600">type</div>
                    <div className="text-gray-500">string</div>
                    <div className="text-red-500">필수</div>
                    <div className="text-gray-600">BUG, INQUIRY, FEATURE</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="font-mono text-indigo-600">message</div>
                    <div className="text-gray-500">string</div>
                    <div className="text-red-500">필수</div>
                    <div className="text-gray-600">피드백 내용</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="font-mono text-indigo-600">email</div>
                    <div className="text-gray-500">string</div>
                    <div className="text-gray-400">선택</div>
                    <div className="text-gray-600">사용자 이메일</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="font-mono text-indigo-600">metadata</div>
                    <div className="text-gray-500">object</div>
                    <div className="text-gray-400">선택</div>
                    <div className="text-gray-600">추가 메타데이터</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Domain Settings */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Globe className="w-6 h-6 text-indigo-600" />
            도메인 설정
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 mb-4">
              보안을 위해 프로젝트별로 허용된 도메인에서만 피드백을 수집할 수 있습니다.
              어드민 대시보드의 프로젝트 설정에서 허용 도메인을 추가하세요.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">도메인 설정 예시</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li><code className="px-1 bg-amber-100 rounded">https://myapp.com</code> - 정확히 일치</li>
                <li><code className="px-1 bg-amber-100 rounded">https://*.myapp.com</code> - 서브도메인 허용</li>
                <li><code className="px-1 bg-amber-100 rounded">*</code> - 모든 도메인 허용 (비권장)</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              도메인을 설정하지 않으면 모든 도메인에서 피드백을 수집할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-600 mb-8">
            무료로 시작하고, 필요할 때 업그레이드하세요.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            무료로 시작하기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>&copy; 2024 Sori. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

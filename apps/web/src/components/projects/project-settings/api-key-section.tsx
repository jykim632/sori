import { useState } from "react";
import { Key, Check, Copy, Eye, EyeOff, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { generateApiKey, revokeApiKey } from "@/server/projects";

type Props = {
  projectId: string;
  initialApiKey: string | null;
};

export function ApiKeySection({ projectId, initialApiKey }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(initialApiKey);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateApiKey = async () => {
    setApiKeyLoading(true);
    try {
      const result = await generateApiKey({ data: { projectId } });
      setApiKey(result.apiKey);
      setShowNewKey(result.apiKey); // 새로 생성된 키는 한 번만 전체 표시
    } catch (error) {
      alert(error instanceof Error ? error.message : "API 키 생성에 실패했습니다.");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleRevokeApiKey = async () => {
    setApiKeyLoading(true);
    try {
      await revokeApiKey({ data: { projectId } });
      setApiKey(null);
      setShowRevokeConfirm(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "API 키 삭제에 실패했습니다.");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key;
    return key.slice(0, 12) + "••••••••••••••••••••";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Key className="w-5 h-5" />
        API 키
      </h2>

      {showNewKey && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 mb-2">
                API 키가 생성되었습니다!
              </p>
              <p className="text-xs text-green-700 mb-3">
                이 키는 한 번만 표시됩니다. 지금 복사해두세요.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono break-all">
                  {showNewKey}
                </code>
                <button
                  onClick={() => copyToClipboard(showNewKey)}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setShowNewKey(null)}
                className="mt-3 text-sm text-green-700 hover:text-green-800"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {apiKey ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">API Key</span>
              <div className="flex gap-1">
                <button
                  onClick={() => copyToClipboard(apiKey)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="복사"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title={apiKeyRevealed ? "숨기기" : "보기"}
                >
                  {apiKeyRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <code className="font-mono text-sm text-gray-800 break-all">
              {apiKeyRevealed ? apiKey : maskApiKey(apiKey)}
            </code>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerateApiKey}
              disabled={apiKeyLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${apiKeyLoading ? "animate-spin" : ""}`} />
              키 재발급
            </button>
            <button
              onClick={() => setShowRevokeConfirm(true)}
              disabled={apiKeyLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              키 삭제
            </button>
          </div>

          <p className="text-xs text-gray-500">
            API 사용법: <code className="bg-gray-100 px-1 py-0.5 rounded">Authorization: Bearer {maskApiKey(apiKey)}</code>
          </p>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Key className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-4">API 키가 없습니다.</p>
          <button
            onClick={handleGenerateApiKey}
            disabled={apiKeyLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {apiKeyLoading ? "생성 중..." : "API 키 발급"}
          </button>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">API 키를 삭제하시겠습니까?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  이 작업은 되돌릴 수 없습니다. 기존 키를 사용하는 모든 API 호출이 즉시 실패합니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRevokeApiKey}
                disabled={apiKeyLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {apiKeyLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

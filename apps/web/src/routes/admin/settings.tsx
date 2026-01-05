import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhookById,
} from "@/server/webhook";
import { Plus, X, Send, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { getWebhookTypeLabel, getWebhookTypeColor, type Webhook, type Organization } from "@/components/admin";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    org: typeof search.org === "string" ? search.org : undefined,
  }),
  loader: async ({ context }) => {
    const ctx = context as { currentOrg: Organization };
    const webhooks = await getWebhooks({ data: { organizationId: ctx.currentOrg.id } }) as Webhook[];
    return { webhooks, currentOrg: ctx.currentOrg };
  },
});

function SettingsPage() {
  const { webhooks, currentOrg } = Route.useLoaderData() as {
    webhooks: Webhook[];
    currentOrg: Organization;
  };
  const router = useRouter();

  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [togglingWebhookId, setTogglingWebhookId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;

    setCreatingWebhook(true);
    try {
      await createWebhook({
        data: {
          organizationId: currentOrg.id,
          name: newWebhookName.trim(),
          url: newWebhookUrl.trim(),
        },
      });
      setNewWebhookName("");
      setNewWebhookUrl("");
      setShowNewWebhook(false);
      router.invalidate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "웹훅 생성 실패");
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleToggleWebhook = async (webhook: Webhook) => {
    setTogglingWebhookId(webhook.id);
    try {
      await updateWebhook({
        data: {
          id: webhook.id,
          enabled: !webhook.enabled,
        },
      });
      router.invalidate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "웹훅 상태 변경에 실패했습니다.");
    } finally {
      setTogglingWebhookId(null);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("정말 이 웹훅을 삭제하시겠습니까?")) return;

    setDeletingWebhookId(webhookId);
    try {
      await deleteWebhook({ data: { id: webhookId } });
      router.invalidate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "웹훅 삭제에 실패했습니다.");
    } finally {
      setDeletingWebhookId(null);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    setWebhookTestResult(null);

    try {
      const result = await testWebhookById({ data: { webhookId } });
      setWebhookTestResult({ id: webhookId, ...result });
    } catch (error) {
      setWebhookTestResult({
        id: webhookId,
        success: false,
        message: error instanceof Error ? error.message : "연결 실패",
      });
    } finally {
      setTestingWebhookId(null);
      setTimeout(() => setWebhookTestResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Webhooks Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">웹훅 설정</h3>
            <p className="text-sm text-gray-500 mt-1">
              새 피드백이 등록되면 지정한 URL로 POST 요청을 보냅니다. Slack, Discord, Telegram과
              연동할 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => setShowNewWebhook(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            웹훅 추가
          </button>
        </div>

        {/* New Webhook Form */}
        {showNewWebhook && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">새 웹훅 추가</h4>
              <button
                onClick={() => setShowNewWebhook(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  required
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Slack - 개발팀"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  required
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Slack, Discord, Telegram URL은 자동으로 인식됩니다.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewWebhook(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creatingWebhook}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {creatingWebhook ? "추가 중..." : "추가"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Webhooks List */}
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`p-4 rounded-lg border ${
                webhook.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleWebhook(webhook)}
                    disabled={togglingWebhookId === webhook.id}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {webhook.enabled ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          webhook.enabled ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {webhook.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getWebhookTypeColor(webhook.type)}`}
                      >
                        {getWebhookTypeLabel(webhook.type)}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate max-w-md ${
                        webhook.enabled ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {webhook.url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {webhookTestResult?.id === webhook.id && (
                    <span
                      className={`text-sm ${
                        webhookTestResult.success ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {webhookTestResult.message}
                    </span>
                  )}
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    disabled={testingWebhookId === webhook.id || !webhook.enabled}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                    title="테스트"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    disabled={deletingWebhookId === webhook.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {webhooks.length === 0 && !showNewWebhook && (
            <div className="text-center py-8 text-gray-400">
              <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>등록된 웹훅이 없습니다.</p>
              <button
                onClick={() => setShowNewWebhook(true)}
                className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                첫 웹훅 추가하기
              </button>
            </div>
          )}
        </div>

        {/* Plan Info */}
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
          {currentOrg.plan === "FREE" ? (
            <>
              무료 플랜은 1개의 웹훅만 사용할 수 있습니다. 더 많은 웹훅이 필요하다면 Pro 플랜으로
              업그레이드하세요.
            </>
          ) : (
            <>
              현재 {currentOrg.plan} 플랜을 사용 중입니다.
              {currentOrg.plan === "PRO" && " 최대 5개의 웹훅을 등록할 수 있습니다."}
              {currentOrg.plan === "TEAM" && " 최대 10개의 웹훅을 등록할 수 있습니다."}
              {currentOrg.plan === "ENTERPRISE" && " 최대 50개의 웹훅을 등록할 수 있습니다."}
            </>
          )}
        </div>
      </div>

      {/* Organization Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">조직 정보</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">조직 ID</span>
            <code className="text-gray-700 font-mono">{currentOrg.id}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Slug</span>
            <code className="text-gray-700 font-mono">{currentOrg.slug}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">플랜</span>
            <span className="text-gray-700">{currentOrg.plan}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

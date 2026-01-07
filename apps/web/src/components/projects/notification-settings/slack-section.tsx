import { MessageSquare, ExternalLink } from "lucide-react";

interface SlackSectionProps {
  enabled: boolean;
  webhookUrl: string;
  error: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onWebhookUrlChange: (url: string) => void;
}

export function SlackSection({
  enabled,
  webhookUrl,
  error,
  onEnabledChange,
  onWebhookUrlChange,
}: SlackSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Slack 알림</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => onWebhookUrlChange(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "slack-url-error" : undefined}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm ${
                error
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-indigo-500"
              }`}
              placeholder="https://hooks.slack.com/services/..."
            />
            {error && <p id="slack-url-error" className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
          </div>

          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
          >
            <ExternalLink className="w-4 h-4" />
            Slack에서 Incoming Webhook 생성하기
          </a>
        </div>
      )}
    </div>
  );
}

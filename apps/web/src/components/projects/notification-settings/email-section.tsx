import { Mail, Check, X } from "lucide-react";

interface EmailSectionProps {
  enabled: boolean;
  recipients: string;
  errors: string[];
  onEnabledChange: (enabled: boolean) => void;
  onRecipientsChange: (recipients: string) => void;
}

export function EmailSection({
  enabled,
  recipients,
  errors,
  onEnabledChange,
  onRecipientsChange,
}: EmailSectionProps) {
  const lines = recipients.split("\n").filter((l) => l.trim());

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">이메일 알림</span>
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
            <label
              htmlFor="email-recipients"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              수신자 이메일 (최대 10명)
            </label>
            <textarea
              id="email-recipients"
              value={recipients}
              onChange={(e) => onRecipientsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              rows={4}
              placeholder={"admin@example.com\nteam@example.com"}
            />
            <p className="mt-1 text-xs text-gray-500">한 줄에 하나씩 입력하세요</p>
          </div>

          {/* Email validation feedback */}
          {lines.length > 0 && (
            <div className="space-y-1">
              {lines.map((line, i) => {
                const isValid = !errors.includes(line.trim());
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm ${
                      isValid ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isValid ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span className="font-mono">{line.trim()}</span>
                  </div>
                );
              })}
            </div>
          )}

          {lines.length > 10 && (
            <p className="text-sm text-red-600">
              이메일 수신자는 최대 10명까지 가능합니다 (현재 {lines.length}명)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Bell, Save, Check } from "lucide-react";
import { getNotificationSetting, updateNotificationSetting } from "@/server/project-notification";
import { EmailSection } from "./email-section";
import { SlackSection } from "./slack-section";

interface NotificationSettingsProps {
  projectId: string;
}

export function NotificationSettings({ projectId }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailErrors, setEmailErrors] = useState<string[]>([]);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackError, setSlackError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadSetting() {
      try {
        const setting = await getNotificationSetting({ data: { projectId } });
        if (setting) {
          setEmailEnabled(setting.emailEnabled);
          setEmailRecipients(setting.emailRecipients.join("\n"));
          setSlackEnabled(setting.slackEnabled);
          setSlackWebhookUrl(setting.slackWebhookUrl || "");
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSetting();
  }, [projectId]);

  // Validate email addresses
  const validateEmails = (text: string): { valid: string[]; errors: string[] } => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const valid: string[] = [];
    const errors: string[] = [];

    for (const line of lines) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line)) {
        valid.push(line);
      } else {
        errors.push(line);
      }
    }

    return { valid, errors };
  };

  // Handle email change
  const handleEmailRecipientsChange = (value: string) => {
    setEmailRecipients(value);
    const { errors } = validateEmails(value);
    setEmailErrors(errors);
    setSaved(false);
  };

  // Validate Slack URL
  const validateSlackUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return parsed.hostname === "hooks.slack.com";
    } catch {
      return false;
    }
  };

  // Handle Slack URL change
  const handleSlackUrlChange = (value: string) => {
    setSlackWebhookUrl(value);
    if (value && !validateSlackUrl(value)) {
      setSlackError("https://hooks.slack.com/ 으로 시작하는 URL만 허용됩니다");
    } else {
      setSlackError(null);
    }
    setSaved(false);
  };

  // Save settings
  const handleSave = async () => {
    const { valid: validEmails, errors } = validateEmails(emailRecipients);

    if (emailEnabled && errors.length > 0) {
      setError("유효하지 않은 이메일 주소가 있습니다");
      return;
    }

    if (emailEnabled && validEmails.length > 10) {
      setError("이메일 수신자는 최대 10명까지 가능합니다");
      return;
    }

    if (slackEnabled && !slackWebhookUrl) {
      setError("Slack 알림을 활성화하려면 Webhook URL을 입력해주세요");
      return;
    }

    if (slackEnabled && !validateSlackUrl(slackWebhookUrl)) {
      setError("유효하지 않은 Slack Webhook URL입니다");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateNotificationSetting({
        data: {
          projectId,
          emailEnabled,
          emailRecipients: validEmails,
          slackEnabled,
          slackWebhookUrl: slackWebhookUrl || null,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-10 bg-gray-200 rounded mb-4" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5" />
        알림 설정
      </h2>

      <p className="text-sm text-gray-500 mb-6">
        새 피드백이 접수되면 이메일 또는 Slack으로 알림을 받을 수 있습니다.
      </p>

      <div className="space-y-6">
        {/* Email Section */}
        <EmailSection
          enabled={emailEnabled}
          recipients={emailRecipients}
          errors={emailErrors}
          onEnabledChange={setEmailEnabled}
          onRecipientsChange={handleEmailRecipientsChange}
        />

        {/* Slack Section */}
        <SlackSection
          enabled={slackEnabled}
          webhookUrl={slackWebhookUrl}
          error={slackError}
          onEnabledChange={setSlackEnabled}
          onWebhookUrlChange={handleSlackUrlChange}
        />

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || emailErrors.length > 0 || !!slackError}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

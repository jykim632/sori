import type { WebhookFormatter } from "../types";
import { slackFormatter } from "./slack";
import { discordFormatter } from "./discord";
import { telegramFormatter } from "./telegram";
import { genericFormatter } from "./generic";

interface FormatterConfig {
  pattern: string;
  formatter: WebhookFormatter;
}

const formatters: FormatterConfig[] = [
  { pattern: "hooks.slack.com", formatter: slackFormatter },
  { pattern: "discord.com/api/webhooks", formatter: discordFormatter },
  { pattern: "api.telegram.org", formatter: telegramFormatter },
];

export function getFormatter(webhookUrl: string): WebhookFormatter {
  const matched = formatters.find((config) => webhookUrl.includes(config.pattern));
  return matched?.formatter ?? genericFormatter;
}

export { slackFormatter, discordFormatter, telegramFormatter, genericFormatter };

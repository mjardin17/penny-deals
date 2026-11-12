/**
 * Posts drop alerts to a Discord channel you own, through a webhook URL you create in that channel's
 * settings (Edit Channel, Integrations, Webhooks). The URL is a secret: anyone with it can post there,
 * so it is never logged or shown.
 */

const WEBHOOK = /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d{5,25}\/[\w-]{20,100}$/;
const MAX_CONTENT = 1900;

export function isDiscordWebhookUrl(url: string | undefined): boolean {
  return typeof url === "string" && WEBHOOK.test(url.trim());
}

/** Splits alert lines into at most `maxMessages` Discord-sized messages, noting how many didn't fit. Exported for tests. */
export function packMessages(lines: string[], maxMessages = 3): string[] {
  const messages: string[] = [];
  let current = "";
  let used = 0;
  for (const raw of lines) {
    const line = raw.length > MAX_CONTENT ? raw.slice(0, MAX_CONTENT - 1) + "…" : raw;
    const joined = current ? `${current}\n${line}` : line;
    if (joined.length <= MAX_CONTENT) {
      current = joined;
      used++;
      continue;
    }
    if (messages.length + 1 >= maxMessages) break;
    messages.push(current);
    current = line;
    used++;
  }
  if (current) messages.push(current);
  const left = lines.length - used;
  // MAX_CONTENT leaves room under Discord's 2000-character limit for this note.
  if (left > 0) messages[messages.length - 1] += `\n…and ${left} more. Open the Drops screen for the rest.`;
  return messages;
}

export function createDiscordNotifier(webhookUrl: string, fetchImpl: typeof fetch = fetch) {
  if (!isDiscordWebhookUrl(webhookUrl)) throw new Error("DISCORD_DROPS_WEBHOOK_URL is not a Discord webhook URL.");
  const url = webhookUrl.trim();

  async function send(content: string): Promise<void> {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No @everyone, @here, role or user pings, whatever a post title says.
      body: JSON.stringify({ username: "Penny Deals drops", content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => {
      throw new Error("Could not reach Discord.");
    });
    if (!res.ok) {
      const why = res.status === 401 || res.status === 404 ? "the webhook was deleted or the URL is wrong" : "Discord returned an error";
      throw new Error(`Discord refused the alert: ${why} (HTTP ${res.status}).`);
    }
  }

  return { send };
}

export type Notifier = { send(content: string): Promise<void> };

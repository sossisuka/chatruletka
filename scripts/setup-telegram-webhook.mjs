const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const siteUrl = process.env.TELEGRAM_SITE_URL?.trim() || "https://videochatik.online/";

if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!webhookSecret) throw new Error("TELEGRAM_WEBHOOK_SECRET is required");
if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
  throw new Error(
    "TELEGRAM_WEBHOOK_SECRET may contain only A-Z, a-z, 0-9, _ and -",
  );
}

const site = new URL(siteUrl);

if (site.protocol !== "https:") {
  throw new Error("TELEGRAM_SITE_URL must use HTTPS");
}

const webhookUrl = new URL("/api/telegram/webhook", site).toString();
const apiUrl = `https://api.telegram.org/bot${botToken}`;

async function callTelegram(method, body = {}) {
  const response = await fetch(`${apiUrl}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status} ${result.description || "unknown error"}`,
    );
  }

  return result.result;
}

const bot = await callTelegram("getMe");

await callTelegram("setWebhook", {
  url: webhookUrl,
  secret_token: webhookSecret,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});

await callTelegram("setMyCommands", {
  commands: [{ command: "start", description: "Открыть VideoChatik" }],
});

console.log(
  `Telegram webhook configured for @${bot.username || bot.id}: ${webhookUrl}`,
);

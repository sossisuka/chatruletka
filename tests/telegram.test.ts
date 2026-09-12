import assert from "node:assert/strict";
import test from "node:test";
import {
  createStartMessage,
  getStartChatId,
  normalizeTelegramSiteUrl,
} from "../src/lib/telegram";
import { POST } from "../src/app/api/telegram/webhook/route";

test("Telegram /start creates a direct website button", () => {
  const chatId = getStartChatId({
    update_id: 1,
    message: {
      text: "/start campaign",
      chat: { id: 123456789, type: "private" },
    },
  });

  assert.equal(chatId, 123456789);

  const message = createStartMessage(chatId, "https://videochatik.online/");
  const button = message.reply_markup.inline_keyboard[0][0];

  assert.equal(message.chat_id, 123456789);
  assert.equal(button.text, "Открыть VideoChatik");
  assert.equal(button.url, "https://videochatik.online/");
  assert.equal("web_app" in button, false);
});

test("Telegram ignores updates that are not /start commands", () => {
  assert.equal(
    getStartChatId({ message: { text: "привет", chat: { id: 1 } } }),
    null,
  );
  assert.equal(getStartChatId({ message: { text: "/starter", chat: { id: 1 } } }), null);
  assert.equal(getStartChatId({}), null);
});

test("Telegram website button requires HTTPS", () => {
  assert.throws(
    () => normalizeTelegramSiteUrl("http://videochatik.online/"),
    /must use HTTPS/,
  );
});

test("Telegram webhook requires configuration and verifies its secret", async () => {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    const unavailable = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    assert.equal(unavailable.status, 503);

    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";

    const unauthorized = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    assert.equal(unauthorized.status, 401);

    const ignoredUpdate = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "test-secret",
        },
        body: JSON.stringify({ message: { text: "привет", chat: { id: 1 } } }),
      }),
    );
    assert.equal(ignoredUpdate.status, 200);
    assert.deepEqual(await ignoredUpdate.json(), { ok: true });
  } finally {
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;

    if (previousSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = previousSecret;
  }
});

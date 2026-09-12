import { timingSafeEqual } from "node:crypto";
import {
  createStartMessage,
  getStartChatId,
  type TelegramUpdate,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEGRAM_API_URL = "https://api.telegram.org";
const DEFAULT_SITE_URL = "https://videochatik.online/";

function secretsMatch(actual: string | null, expected: string): boolean {
  if (!actual) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!botToken || !webhookSecret) {
    return Response.json({ ok: false }, { status: 503 });
  }

  if (
    !secretsMatch(
      request.headers.get("x-telegram-bot-api-secret-token"),
      webhookSecret,
    )
  ) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const chatId = getStartChatId(update);

  if (chatId === null) {
    return Response.json({ ok: true });
  }

  const siteUrl = process.env.TELEGRAM_SITE_URL?.trim() || DEFAULT_SITE_URL;

  try {
    const response = await fetch(
      `${TELEGRAM_API_URL}/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createStartMessage(chatId, siteUrl)),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      console.error(`Telegram sendMessage failed with status ${response.status}`);
      return Response.json({ ok: false }, { status: 502 });
    }
  } catch (error) {
    console.error(
      "Telegram sendMessage request failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json({ ok: false }, { status: 502 });
  }

  return Response.json({ ok: true });
}

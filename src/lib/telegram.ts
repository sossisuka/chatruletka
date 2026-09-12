export type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id?: number;
      type?: string;
    };
  };
};

export type TelegramStartMessage = {
  chat_id: number;
  text: string;
  reply_markup: {
    inline_keyboard: Array<
      Array<{
        text: string;
        url: string;
      }>
    >;
  };
};

const START_COMMAND = /^\/start(?:@[a-z0-9_]+)?(?:\s|$)/i;

export function getStartChatId(update: TelegramUpdate): number | null {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();

  if (!Number.isSafeInteger(chatId) || !text || !START_COMMAND.test(text)) {
    return null;
  }

  return chatId as number;
}

export function normalizeTelegramSiteUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("TELEGRAM_SITE_URL must use HTTPS");
  }

  url.hash = "";
  return url.toString();
}

export function createStartMessage(
  chatId: number,
  siteUrl: string,
): TelegramStartMessage {
  return {
    chat_id: chatId,
    text: [
      "Добро пожаловать в VideoChatik! 👋",
      "",
      "Знакомьтесь и общайтесь с новыми людьми в случайном видеочате.",
      "Нажмите кнопку ниже, чтобы открыть сайт.",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть VideoChatik",
            url: normalizeTelegramSiteUrl(siteUrl),
          },
        ],
      ],
    },
  };
}

import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/");
  const startButton = page.getByRole("button", {
    name: "Старт Начать знакомство",
  });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Включить камеру и начать" }).click();
}
async function connected(page: Page) {
  await expect(page.getByText("На связи", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect
    .poll(() =>
      page
        .getByTestId("remote-video")
        .evaluate(
          (video: HTMLVideoElement) =>
            video.readyState >= 2 && video.videoWidth > 0 && !video.paused,
        ),
    )
    .toBe(true);
}

test("two independent visitors exchange real WebRTC audio/video and text; Stop releases devices", async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const contextB = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const b = await contextB.newPage();
  await start(page);
  await expect(
    page.getByRole("heading", { name: "Ищем собеседника…" }),
  ).toBeVisible();
  await start(b);
  await Promise.all([connected(page), connected(b)]);
  const tracks = await page
    .getByTestId("remote-video")
    .evaluate((v: HTMLVideoElement) =>
      (v.srcObject as MediaStream)
        .getTracks()
        .map((t) => ({ kind: t.kind, state: t.readyState })),
    );
  expect(tracks).toEqual(
    expect.arrayContaining([
      { kind: "video", state: "live" },
      { kind: "audio", state: "live" },
    ]),
  );
  const message =
    "Привет! Это реальный чат <script>window.hacked = true</script>";
  await page
    .getByRole("textbox", { name: "Сообщение собеседнику" })
    .fill(message);
  await page.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(b.getByRole("log").getByText(message)).toBeVisible();
  await b
    .getByRole("textbox", { name: "Сообщение собеседнику" })
    .fill("Привет в ответ!");
  await b
    .getByRole("textbox", { name: "Сообщение собеседнику" })
    .press("Enter");
  await expect(
    page.getByRole("log").getByText("Привет в ответ!"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Выключить микрофон", exact: true })
    .click();
  expect(
    await page
      .getByTestId("local-video")
      .evaluate(
        (v: HTMLVideoElement) =>
          (v.srcObject as MediaStream).getAudioTracks()[0].enabled,
      ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Выключить камеру", exact: true })
    .click();
  expect(
    await page
      .getByTestId("local-video")
      .evaluate(
        (v: HTMLVideoElement) =>
          (v.srcObject as MediaStream).getVideoTracks()[0].enabled,
      ),
  ).toBe(false);
  await page.screenshot({ path: "artifacts/connected.png" });
  await page.getByTestId("local-video").evaluate((v: HTMLVideoElement) => {
    (window as unknown as { savedTracks: MediaStreamTrack[] }).savedTracks = (
      v.srcObject as MediaStream
    ).getTracks();
  });
  await page.getByRole("button", { name: "Стоп Завершить чат" }).click();
  await expect(
    page.getByRole("button", { name: "Старт Начать знакомство" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { savedTracks: MediaStreamTrack[] }
      ).savedTracks.every((t) => t.readyState === "ended"),
    ),
  ).toBe(true);
  await expect(
    b.getByRole("heading", { name: "Ищем собеседника…" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await contextB.close();
});

test("Next switches an actual conversation with a third visitor waiting", async ({
  browser,
  page,
}) => {
  const bContext = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const cContext = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const b = await bContext.newPage();
  const c = await cContext.newPage();
  await start(page);
  await start(b);
  await Promise.all([connected(page), connected(b)]);
  await start(c);
  await expect(
    c.getByRole("heading", { name: "Ищем собеседника…" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Сообщение собеседнику" })
    .fill("Личный черновик для предыдущего собеседника");
  await page.getByRole("button", { name: "Далее Новый собеседник" }).click();
  await expect(
    page.getByRole("textbox", { name: "Сообщение собеседнику" }),
  ).toHaveValue("");
  await connected(c);
  await expect
    .poll(async () => {
      const aConnected = await page
        .getByText("На связи", { exact: true })
        .isVisible();
      const bConnected = await b
        .getByText("На связи", { exact: true })
        .isVisible();
      return aConnected !== bConnected;
    })
    .toBe(true);
  await bContext.close();
  await cContext.close();
});

test("country filter waits for a compatible visitor", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Страна собеседника" })
    .selectOption("DE");
  await page.getByRole("button", { name: "Старт Начать знакомство" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Включить камеру и начать" }).click();
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const b = await context.newPage();
  await start(b);
  await expect(
    page.getByRole("heading", { name: "Ищем собеседника…" }),
  ).toBeVisible();
  await expect(
    b.getByRole("heading", { name: "Ищем собеседника…" }),
  ).toBeVisible();
  await b.getByRole("button", { name: "Стоп Завершить чат" }).click();
  await b.getByRole("button", { name: "Настройки", exact: true }).click();
  await b.getByLabel("Ваша страна", { exact: false }).selectOption("DE");
  await b.getByRole("button", { name: "Готово" }).click();
  await b.getByRole("button", { name: "Старт Начать знакомство" }).click();
  await Promise.all([connected(page), connected(b)]);
  await context.close();
});

test("permission denial produces a useful error and leaves the queue empty", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
  });
  await start(page);
  await expect(page.getByRole("status")).toContainText(
    "Разрешите доступ к камере",
  );
  await expect(
    page.getByRole("button", { name: "Старт Начать знакомство" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Стоп Завершить чат" }),
  ).toBeDisabled();
});

test("Stop while the permission dialog is pending releases the late stream", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (options) => {
      const stream = await original(options);
      (window as unknown as { lateStream: MediaStream }).lateStream = stream;
      await new Promise<void>((resolve) => {
        (window as unknown as { allowMedia: () => void }).allowMedia = resolve;
      });
      return stream;
    };
  });
  await start(page);
  await expect(
    page.getByRole("heading", { name: "Включаем вашу камеру…" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => typeof (window as unknown as { allowMedia: unknown }).allowMedia,
      ),
    )
    .toBe("function");
  await page.getByRole("button", { name: "Стоп Завершить чат" }).click();
  await page.evaluate(() =>
    (window as unknown as { allowMedia: () => void }).allowMedia(),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { lateStream: MediaStream }).lateStream
          .getTracks()
          .every((t) => t.readyState === "ended"),
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Старт Начать знакомство" }),
  ).toBeEnabled();
});

test("mobile layout, settings, consent and rules work without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Старт Начать знакомство" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Ваши настройки" }),
  ).toBeVisible();
  await page.getByLabel("Ваша страна", { exact: false }).selectOption("KZ");
  await page.getByRole("button", { name: "Готово" }).click();
  await expect(
    page.getByText("Ваша страна: Казахстан.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Правила сообщества" }).click();
  await expect(page.getByRole("dialog")).toContainText("Только для взрослых");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Старт Начать знакомство" }).click();
  await expect(
    page.getByRole("button", { name: "Включить камеру и начать" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("button", { name: "Включить камеру и начать" }),
  ).toBeEnabled();
});

test("external HTTP connects to the chat server and explains why camera requires HTTPS", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("http://chatruletka.test:3005/");
  await expect(
    page.getByRole("button", { name: "Старт Начать знакомство" }),
  ).toBeEnabled();
  await expect(page.locator(".online-pill")).toContainText("онлайн");
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  await expect(page.locator(".connection-notice")).toContainText(
    "Для видеочата нужен HTTPS",
  );
  await page.getByRole("button", { name: "Старт Начать знакомство" }).click();
  await expect(page.locator(".notice")).toContainText("внешнему HTTP-адресу");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(failures).toEqual([]);
});

test("motion is active by default and disabled when reduced motion is requested", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Старт Начать знакомство" }),
  ).toBeEnabled();
  expect(
    await page
      .locator(".hero-mark")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("float-mark");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("modal-in");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".hero-mark")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Globe2,
  Info,
  LoaderCircle,
  Maximize,
  MessageCircle,
  Mic,
  MicOff,
  Play,
  Send,
  Settings2,
  ShieldCheck,
  ShieldOff,
  SkipForward,
  Square,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useVideoChat } from "@/hooks/use-video-chat";
import { countryName } from "@/lib/protocol";
import { VideoPane } from "./video-pane";
import { Modal } from "./modal";
import { CountryFlag } from "./country-flag";
import { CountrySelect } from "./country-select";
import { GenderSelect } from "./gender-select";
import { NoiseCanvas } from "./noise-canvas";

type Dialog = "rules" | "privacy" | "settings" | "start" | "block" | null;
const statusLabels = {
  idle: "ВидеоЧат RU",
  requesting: "Включаем вашу камеру…",
  searching: "Ищем собеседника…",
  connecting: "Устанавливаем связь…",
  connected: "Вы в эфире",
};

export function ChatApp() {
  const chat = useVideoChat();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [accepted, setAccepted] = useState(false);
  const [ageChecked, setAgeChecked] = useState(false);
  const [draftState, setDraft] = useState({ sessionId: "", text: "" });
  const [mirror, setMirror] = useState(true);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const videoPanelRef = useRef<HTMLElement>(null);
  const active = chat.status !== "idle";
  const paired = chat.status === "connecting" || chat.status === "connected";
  const searching = chat.status === "searching" || chat.status === "connecting";
  const peerCountry = chat.match?.peer.country;
  const time = `${String(Math.floor(chat.elapsed / 60)).padStart(2, "0")}:${String(chat.elapsed % 60).padStart(2, "0")}`;
  const sessionId = chat.match?.sessionId || "";
  const draft = draftState.sessionId === sessionId ? draftState.text : "";

  useEffect(() => {
    if (chat.messages.length && messagesRef.current)
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [chat.messages]);

  function start() {
    if (!chat.secureContext) {
      void chat.start();
      return;
    }
    if (!accepted) {
      setDialog("start");
      return;
    }
    void chat.start();
  }
  function confirmStart() {
    setAccepted(true);
    setDialog(null);
    void chat.start();
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft;
    if (await chat.sendMessage(text))
      setDraft((current) =>
        current.sessionId === sessionId && current.text === text
          ? { sessionId, text: "" }
          : current,
      );
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await videoPanelRef.current?.requestFullscreen();
    } catch {
      setFullscreenError("Браузер не поддерживает полноэкранный режим.");
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="Chatruletka — главная">
            <span className="brand-icon">
              <span className="revolver-icon" aria-hidden="true" />
            </span>
            <span>
              Chatruletka<span className="brand-dot">.</span>
            </span>
          </a>
          <nav aria-label="Основная навигация">
            <a className="nav-active" href="#chat">
              Видеочат
            </a>
            <a href="#how-it-works">Как это работает</a>
            <button onClick={() => setDialog("rules")}>Правила</button>
          </nav>
          <div
            className={`online-pill ${!chat.serverConnected ? "offline" : ""}`}
            aria-live="polite"
          >
            <span className="live-dot" />
            <strong>
              {chat.serverConnected
                ? chat.stats.online.toLocaleString("ru-RU")
                : "…"}
            </strong>
            <span>{chat.serverConnected ? "онлайн" : "подключаемся"}</span>
          </div>
          <button
            className="icon-button header-settings"
            aria-label="Настройки"
            onClick={() => setDialog("settings")}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      <main>
        <section className="intro" id="chat">
          <div>
            <div className="eyebrow">
              <span /> ЧАТ-РУЛЕТКА ДЛЯ РУССКИХ ПОЛЬЗОВАТЕЛЕЙ
            </div>
            <h1>
              Мир ближе, чем кажется<span>.</span>
            </h1>
            <p>Знакомьтесь, улыбайтесь и просто будьте собой.</p>
          </div>
          <div className="intro-note">
            <ShieldCheck size={20} />
            <span>
              Без регистрации.
              <br />
              <strong>Только живое общение.</strong>
            </span>
          </div>
        </section>

        {!chat.secureContext && (
          <aside className="connection-notice" role="status">
            <ShieldCheck size={22} />
            <div>
              <strong>Для видеочата нужен HTTPS</strong>
              <p>
                По внешнему HTTP-адресу браузер не разрешает включать камеру и
                микрофон. Владелец сайта должен настроить защищённый адрес. На
                localhost видеочат работает без HTTPS.
              </p>
            </div>
          </aside>
        )}

        <div className="chat-workspace" data-status={chat.status}>
          <section
            className={`video-panel remote-panel ${chat.remoteStream ? "has-video" : ""} ${chat.status === "connected" ? "call-connected" : ""}`}
            ref={videoPanelRef}
            aria-label="Окно собеседника"
          >
            <VideoPane
              stream={chat.remoteStream}
              muted={remoteMuted}
              label="Видео собеседника"
            />
            {!chat.remoteStream && <NoiseCanvas />}
            <div className="video-top">
              <span className="video-tag">
                <span
                  className={`small-dot ${chat.status === "connected" ? "green" : ""}`}
                />
                {chat.status === "connected"
                  ? "Собеседник"
                  : "Ваш следующий собеседник"}
              </span>
              {chat.status === "connected" && (
                <span className="video-tag timer">{time}</span>
              )}
            </div>
            {!chat.remoteStream && (
              <div className="remote-placeholder">
                <div
                  className={`connection-orbit ${searching ? "is-searching" : ""}`}
                >
                  <div className="orbit-ring ring-one" />
                  <div className="orbit-ring ring-two" />
                  <div className="orbit-ring ring-three" />
                  <span className="orbit-spark spark-one" />
                  <span className="orbit-spark spark-two" />
                  <span className="orbit-spark spark-three" />
                  <span className="hero-mark">
                    <span className="revolver-icon" aria-hidden="true" />
                  </span>
                </div>
                <h2 key={`heading-${chat.status}`} className="status-heading">
                  {statusLabels[chat.status]}
                </h2>
                <span className="remote-online">
                  <span className="live-dot" />
                  {chat.serverConnected
                    ? chat.stats.online.toLocaleString("ru-RU")
                    : "…"}{" "}
                  пользователей онлайн
                </span>
                <p
                  key={`description-${chat.status}`}
                  className="status-description"
                >
                  {chat.status === "searching"
                    ? chat.serverConnected
                      ? "Оставайтесь здесь — подключим, как только кто-то появится."
                      : "Восстанавливаем связь с сервером…"
                    : chat.status === "connecting"
                      ? "Собеседник найден. Ещё один момент."
                      : chat.status === "requesting"
                        ? "Разрешите доступ к камере и микрофону в браузере."
                        : "Одно нажатие. Кто-то интересный по ту сторону."}
                </p>
                {!active && (
                  <span className="placeholder-hint">
                    <ArrowDown size={14} /> Нажмите «Старт», чтобы познакомиться
                  </span>
                )}
                {chat.status === "searching" && (
                  <span className="search-indicator" key={chat.status}>
                    <LoaderCircle size={15} className="spin" />{" "}
                    {chat.stats.searching} в поиске · {chat.stats.online} онлайн
                  </span>
                )}
                <div className="browser-badges" aria-hidden="true">
                  <span>
                    <Play size={26} fill="currentColor" />
                    Общайся в браузере
                  </span>
                  <span>
                    <ShieldCheck size={27} />
                    Без регистрации
                  </span>
                </div>
              </div>
            )}
            <div className="video-bottom">
              <span className="video-location">
                {peerCountry ? (
                  <>
                    <CountryFlag code={peerCountry} /> {countryName(peerCountry)}
                  </>
                ) : (
                  <>
                    <Globe2 size={14} /> Весь мир в одном разговоре
                  </>
                )}
              </span>
              <div className="video-tools">
                {paired && (
                  <>
                    <button
                      title="Заблокировать собеседника"
                      aria-label="Заблокировать собеседника"
                      onClick={() => setDialog("block")}
                    >
                      <ShieldOff size={17} />
                    </button>
                    <button
                      title={
                        remoteMuted
                          ? "Включить звук собеседника"
                          : "Выключить звук собеседника"
                      }
                      aria-label={
                        remoteMuted
                          ? "Включить звук собеседника"
                          : "Выключить звук собеседника"
                      }
                      onClick={() => setRemoteMuted(!remoteMuted)}
                    >
                      {remoteMuted ? (
                        <VolumeX size={17} />
                      ) : (
                        <Volume2 size={17} />
                      )}
                    </button>
                  </>
                )}
                <button
                  title="На весь экран"
                  aria-label="На весь экран"
                  onClick={fullscreen}
                >
                  <Maximize size={17} />
                </button>
              </div>
            </div>
          </section>

          <section
            className={`video-panel local-panel ${chat.localStream ? "has-video" : ""}`}
            aria-label="Ваше видео"
          >
            <VideoPane
              stream={chat.localStream}
              muted
              mirror={mirror}
              label="Ваше видео"
              className={!chat.cameraOn ? "camera-hidden" : ""}
            />
            <div className="video-top">
              <span className="video-tag">Вы</span>
              <span className="local-private">
                <ShieldCheck size={13} />{" "}
                {active
                  ? "Камера под вашим контролем"
                  : "Камера ещё не включена"}
              </span>
            </div>
            {(!chat.localStream || !chat.cameraOn) && (
              <div
                className={`local-placeholder${!chat.localStream ? " is-waiting" : ""}`}
              >
                <span className="camera-placeholder">
                  {chat.localStream ? (
                    <VideoOff size={30} strokeWidth={1.4} />
                  ) : (
                    <LoaderCircle
                      size={72}
                      strokeWidth={3}
                      className="spin idle-camera-loader"
                    />
                  )}
                </span>
                <h3>
                  {chat.localStream ? "Камера выключена" : "Здесь будете вы"}
                </h3>
                <p>
                  {chat.localStream
                    ? "Нажмите на значок камеры, чтобы включить видео."
                    : "Камера включится, когда вы будете готовы."}
                </p>
                {!chat.localStream && (
                  <span className="device-hint">
                    <Video size={13} /> Камера <span>+</span>
                    <Mic size={13} /> Микрофон
                  </span>
                )}
              </div>
            )}
            <div className="local-controls">
              <button
                disabled={!chat.localStream}
                aria-label={
                  chat.micOn ? "Выключить микрофон" : "Включить микрофон"
                }
                aria-pressed={!chat.micOn}
                title="Микрофон"
                onClick={chat.toggleMic}
                className={!chat.micOn ? "device-off" : ""}
              >
                {chat.micOn ? <Mic size={19} /> : <MicOff size={19} />}
              </button>
              <button
                disabled={!chat.localStream}
                aria-label={
                  chat.cameraOn ? "Выключить камеру" : "Включить камеру"
                }
                aria-pressed={!chat.cameraOn}
                title="Камера"
                onClick={chat.toggleCamera}
                className={!chat.cameraOn ? "device-off" : ""}
              >
                {chat.cameraOn ? <Video size={19} /> : <VideoOff size={19} />}
              </button>
              <button
                aria-label="Настройки"
                title="Настройки"
                onClick={() => setDialog("settings")}
              >
                <Settings2 size={19} />
              </button>
            </div>
          </section>

          <section
            className="controls-panel"
            aria-label="Управление видеочатом"
          >
            <div className="primary-controls">
              <button
                className="start-button"
                onClick={paired ? () => chat.nextPeer() : start}
                disabled={!chat.serverConnected || (active && !paired)}
              >
                {paired ? (
                  <SkipForward size={24} fill="currentColor" />
                ) : searching || chat.status === "requesting" ? (
                  <LoaderCircle size={24} className="spin" />
                ) : (
                  <Play size={24} fill="currentColor" />
                )}
                <span>
                  <strong>
                    {paired ? "Далее" : active ? "Поиск…" : "Старт"}
                  </strong>
                  <small>
                    {paired
                      ? "Новый собеседник"
                      : active
                        ? "Соединяем вас"
                        : "Начать знакомство"}
                  </small>
                </span>
                {!active && <ArrowRight size={20} className="start-arrow" />}
              </button>
              <button
                className="stop-button"
                onClick={chat.stop}
                disabled={!active}
              >
                <Square size={22} fill="currentColor" />
                <span>
                  <strong>Стоп</strong>
                  <small>Завершить чат</small>
                </span>
              </button>
            </div>
            <div className="filter-row">
              <CountrySelect
                className="filter country-filter"
                label="Страна собеседника"
                caption="Собеседники из"
                includeAll
                value={chat.profile.lookingForCountry}
                disabled={active}
                onChange={(country) =>
                  chat.updateProfile({ ...chat.profile, lookingForCountry: country })
                }
              />
              <GenderSelect
                value={chat.profile.gender}
                disabled={active}
                onChange={(gender) =>
                  chat.updateProfile({ ...chat.profile, gender })
                }
              />
            </div>
            <p className="filter-hint">
              {active ? (
                "Остановите поиск, чтобы изменить настройки."
              ) : (
                <>
                  Ваша страна:{" "}
                  {chat.serverConnected ? countryName(chat.profile.country) : "Определяем…"}
                  .{" "}
                  <button onClick={() => setDialog("settings")}>
                    Подробнее
                  </button>
                </>
              )}
            </p>
            <div className="safety-note">
              <ShieldCheck size={22} />
              <p>
                Хорошие разговоры начинаются с уважения.
                <br />
                <button onClick={() => setDialog("rules")}>
                  Правила сообщества <ArrowRight size={12} />
                </button>
              </p>
              <span>18+</span>
            </div>
          </section>

          <section className="text-chat" aria-label="Текстовый чат">
            <div className="text-chat-header">
              <span>
                <MessageCircle size={17} />
                <strong>Сообщения</strong>
              </span>
              <span
                className={
                  chat.status === "connected" ? "chat-live" : "chat-private"
                }
              >
                {chat.status === "connected" ? (
                  <>
                    <span className="live-dot" /> На связи
                  </>
                ) : (
                  "Только между вами"
                )}
              </span>
            </div>
            <div
              className="messages"
              ref={messagesRef}
              role="log"
              aria-live="polite"
              aria-label="Сообщения разговора"
            >
              {chat.messages.length === 0 ? (
                <div className="system-warning">
                  <span className="system-avatar">
                    <span className="revolver-icon" aria-hidden="true" />
                  </span>
                  <p>
                    Нажав «Старт», вы обязуетесь следовать нашим{" "}
                    <button type="button" onClick={() => setDialog("rules")}>
                      правилам
                    </button>
                    . Любое нарушение приведет к блокировке аккаунта.
                    Убедитесь, что ваше лицо хорошо видно собеседнику.
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-row ${message.mine ? "mine" : "theirs"}`}
                  >
                    <div className="message-bubble">
                      <p>{message.text}</p>
                      <time dateTime={new Date(message.sentAt).toISOString()}>
                        {new Date(message.sentAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {message.mine && <Check size={12} />}
                      </time>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form className="message-form" onSubmit={send}>
              <input
                aria-label="Сообщение собеседнику"
                placeholder={
                  paired
                    ? "Введите сообщение…"
                    : "Введите сюда текст сообщения и нажмите Enter"
                }
                value={draft}
                onChange={(e) => setDraft({ sessionId, text: e.target.value })}
                maxLength={2000}
                disabled={chat.status !== "connected"}
                autoComplete="off"
              />
              <button
                type="submit"
                aria-label="Отправить сообщение"
                disabled={
                  chat.status !== "connected" || !draft.trim() || chat.sending
                }
              >
                <Send size={19} />
              </button>
            </form>
          </section>
        </div>

        {(chat.notice || fullscreenError) && (
          <div className="notice" role="status">
            <Info size={19} />
            <p>{chat.notice || fullscreenError}</p>
            <button
              className="icon-button"
              aria-label="Скрыть уведомление"
              onClick={() => {
                chat.clearNotice();
                setFullscreenError("");
              }}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="reference-logo" aria-label="ВидеоЧат RU">
          <span className="revolver-icon" aria-hidden="true" />
          <span>ВидеоЧат RU</span>
        </section>

        <section id="how-it-works" className="how-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">БЕСПЛАТНЫЙ ВИДЕОЧАТ ДЛЯ ОБЩЕНИЯ</span>
              <h1>Знакомься и Заводи Друзей в Чат Рулетке</h1>
            </div>
            <p>
              VideoChatik помогает встретить нового человека без анкет,
              переписок на неделю и лишних шагов.
            </p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-illustration" aria-hidden="true">
                <Image
                  src="/assets/images/1-chatruletka-videochat.svg"
                  alt=""
                  width={46}
                  height={112}
                  loading="eager"
                />
              </span>
              <div>
                <h3>Начни общение в один клик</h3>
                <p>
                  Нажмите «Старт», разрешите доступ к камере и микрофону —
                  система подберёт собеседника в реальном времени.
                </p>
              </div>
            </article>
            <article>
              <span className="feature-illustration" aria-hidden="true">
                <Image
                  src="/assets/images/2-random-videochat.svg"
                  alt=""
                  width={189}
                  height={273}
                  loading="eager"
                />
              </span>
              <div>
                <h3>Найди свою половинку или нового друга</h3>
                <p>
                  Видеочат подходит для случайных знакомств, лёгкой беседы
                  вечером и общения с людьми из других стран.
                </p>
              </div>
            </article>
            <article>
              <span className="feature-illustration" aria-hidden="true">
                <Image
                  src="/assets/images/3-chat-ruletka.svg"
                  alt=""
                  width={141}
                  height={227}
                  loading="eager"
                />
              </span>
              <div>
                <h3>Преимущества чат-рулетки</h3>
                <p>
                  Простой интерфейс, быстрый старт, выбор страны, живое видео
                  и кнопка «Далее», если хочется продолжить поиск.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="faq-section" aria-label="Частые вопросы">
          <details open>
            <summary>
              Почему чат Рулетка — отличная альтернатива приложениям для знакомств?
              <ChevronDown size={17} />
            </summary>
            <p>
              Здесь не нужно листать анкеты и ждать ответа. Камера сразу
              показывает живого человека, поэтому проще понять настроение,
              услышать голос и начать настоящий разговор.
            </p>
          </details>
          <details open>
            <summary>
              Как работает подбор собеседников?
              <ChevronDown size={17} />
            </summary>
            <p>
              После нажатия «Старт» вы попадаете в общую очередь посетителей
              этого приложения. Когда появляется человек с совместимыми
              настройками страны, начинается видеосвязь. Если вы одни, поиск
              продолжится до появления другого участника. Последний собеседник
              не подбирается повторно сразу после «Далее».
            </p>
          </details>
          <details open>
            <summary>
              Найди собеседника на вечер
              <ChevronDown size={17} />
            </summary>
            <p>
              Открой сайт, нажми «Старт» и оставайся на странице. Если рядом
              есть другой пользователь с совместимыми настройками, видеосвязь
              начнётся автоматически. Если никого нет, поиск продолжится до
              появления нового участника.
            </p>
          </details>
          <details open>
            <summary>
              Сохраняются ли мои разговоры?
              <ChevronDown size={17} />
            </summary>
            <p>
              Это приложение не записывает видео и звук. Сообщения передаются
              через сервер и хранятся только в памяти вкладки, до следующего
              разговора или перезагрузки. Собеседник может самостоятельно
              записать экран — учитывайте это при общении.
            </p>
          </details>
        </section>
        <section className="closing-story" aria-label="Общение в Чат Рулетке">
          <p>
            Делись историями, обменивайся идеями и заводи новые знакомства в
            бесплатном видеочате Рулетка!
          </p>
          <Image
            src="/assets/images/videochat-chatruletka-illustration.svg"
            alt="Люди общаются в видеочате"
            width={495}
            height={316}
            loading="eager"
          />
        </section>
      </main>
      <footer className="site-footer">
        <a className="brand footer-brand" href="#">
          <span className="revolver-icon" aria-hidden="true" />
          <span>Chatruletka.</span>
        </a>
        <span className="footer-tagline">
          Меньше расстояний. Больше общения.
        </span>
        <div>
          <button onClick={() => setDialog("privacy")}>
            Конфиденциальность
          </button>
          <button onClick={() => setDialog("rules")}>Правила</button>
          <span className="age-badge">18+</span>
        </div>
      </footer>

      {dialog === "start" && (
        <Modal
          title="Найди новых друзей"
          className="login-modal"
          onClose={() => setDialog(null)}
        >
          <div className="login-popup-layout">
            <div className="login-popup-brand">
              <span className="logo-vertical" aria-hidden="true" />
              <span className="remote-online">
                <span className="live-dot" />
                {chat.serverConnected
                  ? chat.stats.online.toLocaleString("ru-RU")
                  : "…"}{" "}
                пользователей онлайн
              </span>
            </div>
            <div className="login-popup-actions">
              <h3>Найди новых друзей</h3>
              <p>
                Разрешите камеру и микрофон, чтобы начать случайный видеочат
                прямо сейчас.
              </p>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={ageChecked}
                  onChange={(e) => setAgeChecked(e.target.checked)}
                />
                <span>
                  Я подтверждаю, что мне уже исполнилось 18 лет. Я принимаю
                  правила сообщества.
                </span>
              </label>
              <button
                className="modal-primary"
                disabled={!ageChecked}
                onClick={confirmStart}
              >
                Включить камеру и начать <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {dialog === "settings" && (
        <Modal title="Ваши настройки" onClose={() => setDialog(null)}>
          <p className="modal-copy">
            Немного о вас — для подходящих знакомств.
          </p>
          <div className="settings-field">
            <span>Ваша страна</span>
            <div className="detected-country">
              <CountryFlag code={chat.profile.country} />
              <strong>{chat.serverConnected ? countryName(chat.profile.country) : "Определяем…"}</strong>
            </div>
            <small>
              {chat.profile.country === "UNKNOWN"
                ? "Пока не удалось определить страну. Поиск по всему миру доступен."
                : "Страна определена автоматически по вашему IP через 2ip."}
              {" "}При использовании VPN может отображаться страна VPN-сервера.
            </small>
          </div>
          <label className="setting-toggle">
            <span>
              Отразить своё видео<small>Отражение видите только вы</small>
            </span>
            <input
              type="checkbox"
              checked={mirror}
              onChange={(e) => setMirror(e.target.checked)}
            />
          </label>
          <label className="setting-toggle">
            <span>Звук собеседника</span>
            <input
              type="checkbox"
              checked={!remoteMuted}
              onChange={(e) => setRemoteMuted(!e.target.checked)}
            />
          </label>
          <button className="modal-primary" onClick={() => setDialog(null)}>
            Готово <Check size={18} />
          </button>
        </Modal>
      )}
      {dialog === "rules" && (
        <Modal
          title="Место для хороших разговоров"
          onClose={() => setDialog(null)}
        >
          <p className="modal-copy">
            За каждым экраном — человек. Давайте относиться друг к другу с
            уважением.
          </p>
          <ul className="rules-list">
            <li>
              <strong>Только для взрослых</strong>
              <p>Видеочат предназначен для людей от 18 лет.</p>
            </li>
            <li>
              <strong>Будьте доброжелательны</strong>
              <p>Не оскорбляйте, не угрожайте и уважайте личные границы.</p>
            </li>
            <li>
              <strong>Без откровенного контента и спама</strong>
              <p>Не показывайте обнажённое тело, насилие или рекламу.</p>
            </li>
            <li>
              <strong>Вы управляете разговором</strong>
              <p>
                «Далее» найдёт нового человека. Кнопка щита блокирует текущего
                собеседника до его переподключения. Постоянной модерации в этой
                версии нет.
              </p>
            </li>
          </ul>
          <button className="modal-primary" onClick={() => setDialog(null)}>
            Всё понятно <Check size={18} />
          </button>
        </Modal>
      )}
      {dialog === "privacy" && (
        <Modal title="Конфиденциальность" onClose={() => setDialog(null)}>
          <div className="privacy-copy">
            <p>
              Камера и микрофон включаются только с вашего разрешения. Видео и
              звук передаются по WebRTC, напрямую между участниками или через
              TURN-сервер. При прямом соединении собеседник может узнать ваш
              IP-адрес.
            </p>
            <p>
              Приложение не записывает разговоры. Текст проходит через сервер
              без сохранения в базу данных. В памяти сервера временно находятся
              определённая страна, пол, состояние очереди и идентификатор
              соединения.
            </p>
            <p>
              Для определения страны ваш IP-адрес передаётся сервису 2ip.
              Результат хранится в памяти сервера до часа. Геолокация устройства
              не запрашивается. Определение страны по IP не подтверждает личность
              человека и может показывать местоположение VPN-сервера.
            </p>
            <p>
              Блокировка действует в пределах текущих подключений. При
              перезагрузке страницы или переподключении идентификаторы меняются.
              Собеседник может записать экран собственными средствами.
            </p>
            <p>
              Для установления связи используются STUN-серверы Google и
              Cloudflare, которые получают сетевой адрес подключения. Кнопка
              «Стоп» закрывает связь и освобождает камеру и микрофон.
            </p>
          </div>
          <button className="modal-primary" onClick={() => setDialog(null)}>
            Понятно
          </button>
        </Modal>
      )}
      {dialog === "block" && (
        <Modal
          title="Пропустить и заблокировать?"
          onClose={() => setDialog(null)}
        >
          <p className="modal-copy">
            Разговор завершится, и мы найдём нового человека. Этот собеседник не
            попадётся вам снова, пока его текущее подключение активно.
          </p>
          <p className="settings-note">
            Это блокировка в текущей сессии. Жалоба модератору не отправляется.
          </p>
          <button
            className="modal-primary danger"
            onClick={() => {
              chat.nextPeer(true);
              setDialog(null);
            }}
          >
            Заблокировать и продолжить <SkipForward size={18} />
          </button>
        </Modal>
      )}
      <a href="#how-it-works" className="help-link" aria-label="Помощь">
        <CircleHelp size={20} />
      </a>
    </>
  );
}

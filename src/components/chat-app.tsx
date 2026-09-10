"use client";

import { useEffect, useRef, useState } from "react";
import {
  Aperture,
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Globe2,
  HeartHandshake,
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
  Shuffle,
  SkipForward,
  Square,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useVideoChat } from "@/hooks/use-video-chat";
import { countries, type Gender } from "@/lib/protocol";
import { VideoPane } from "./video-pane";
import { Modal } from "./modal";

type Dialog = "rules" | "privacy" | "settings" | "start" | "block" | null;
const statusLabels = {
  idle: "Готовы к знакомству?",
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
  const peerCountry = countries.find(
    (c) => c.code === chat.match?.peer.country,
  );
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
              <Aperture strokeWidth={2.2} />
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
              <span /> НОВЫЙ РАЗГОВОР — НОВАЯ ИСТОРИЯ
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
                    {searching ? (
                      <Shuffle size={45} strokeWidth={1.5} />
                    ) : (
                      <Aperture size={64} strokeWidth={1.5} />
                    )}
                  </span>
                </div>
                <h2 key={`heading-${chat.status}`} className="status-heading">
                  {statusLabels[chat.status]}
                </h2>
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
              </div>
            )}
            <div className="video-bottom">
              <span className="video-location">
                {peerCountry ? (
                  <>
                    {peerCountry.flag} {peerCountry.name}
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
              <div className="local-placeholder">
                <span className="camera-placeholder">
                  <VideoOff size={30} strokeWidth={1.4} />
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
                aria-label="Настройки видео"
                title="Настройки видео"
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
              <label className="filter">
                <Globe2 size={19} />
                <span>
                  <small>Собеседники из</small>
                  <select
                    aria-label="Страна собеседника"
                    value={chat.profile.lookingForCountry}
                    disabled={active}
                    onChange={(e) =>
                      chat.updateProfile({
                        ...chat.profile,
                        lookingForCountry: e.target.value,
                      })
                    }
                  >
                    <option value="all">Всего мира</option>
                    {countries.map((c) => (
                      <option value={c.code} key={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </span>
                <ChevronDown size={15} />
              </label>
              <label className="filter">
                <Users size={19} />
                <span>
                  <small>Ваш пол</small>
                  <select
                    aria-label="Ваш пол"
                    value={chat.profile.gender}
                    disabled={active}
                    onChange={(e) =>
                      chat.updateProfile({
                        ...chat.profile,
                        gender: e.target.value as Gender,
                      })
                    }
                  >
                    <option value="other">Не указан</option>
                    <option value="male">Мужчина</option>
                    <option value="female">Женщина</option>
                  </select>
                </span>
                <ChevronDown size={15} />
              </label>
            </div>
            <p className="filter-hint">
              {active ? (
                "Остановите поиск, чтобы изменить настройки."
              ) : (
                <>
                  Ваша страна:{" "}
                  {countries.find((c) => c.code === chat.profile.country)?.name}
                  .{" "}
                  <button onClick={() => setDialog("settings")}>
                    Изменить
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
                <div className="empty-chat">
                  <span className="empty-chat-icon">
                    <MessageCircle size={23} strokeWidth={1.5} />
                  </span>
                  <h3>
                    {paired
                      ? "Начните с простого «Привет!»"
                      : "Разговор начинается с «Привет!»"}
                  </h3>
                  <p>
                    {paired
                      ? "Пишите здесь — собеседник увидит ваше сообщение."
                      : "Здесь можно написать собеседнику, когда вы подключитесь."}
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
                    ? "Напишите сообщение…"
                    : "Сначала найдите собеседника…"
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

        <section id="how-it-works" className="how-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ПРОСТО БУДЬТЕ СОБОЙ</span>
              <h2>Незнакомцы. Пока что.</h2>
            </div>
            <p>
              Иногда лучший разговор — тот,
              <br />
              которого вы не планировали.
            </p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-icon">
                <Video size={23} />
              </span>
              <div>
                <h3>Один клик — и вы на связи</h3>
                <p>
                  Включите камеру и нажмите «Старт». <br />
                  Мы найдём того, кто тоже готов пообщаться.
                </p>
              </div>
            </article>
            <article>
              <span className="feature-icon">
                <Globe2 size={23} />
              </span>
              <div>
                <h3>Знакомства без границ</h3>
                <p>
                  Выбирайте страну или доверьтесь случаю. <br />
                  Каждый разговор — маленькое открытие.
                </p>
              </div>
            </article>
            <article>
              <span className="feature-icon">
                <HeartHandshake size={23} />
              </span>
              <div>
                <h3>В своём ритме</h3>
                <p>
                  Общайтесь сколько хочется. Нажмите <br />
                  «Далее», когда захотите встретить другого.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="faq-section" aria-label="Частые вопросы">
          <details>
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
          <details>
            <summary>
              Почему не включается камера?
              <ChevronDown size={17} />
            </summary>
            <p>
              Разрешите камеру и микрофон в адресной строке браузера. Закройте
              приложения, которые могут использовать камеру. Доступ к
              устройствам работает на HTTPS и localhost. Если связь не
              устанавливается в некоторых сетях, администратору приложения нужно
              подключить TURN-сервер.
            </p>
          </details>
          <details>
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
      </main>
      <footer className="site-footer">
        <a className="brand footer-brand" href="#">
          <Aperture size={22} />
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
        <Modal title="Перед знакомством" onClose={() => setDialog(null)}>
          <div className="modal-hero-icon">
            <Video size={30} />
          </div>
          <p className="modal-copy">
            Включите камеру, устройтесь поудобнее — новый разговор совсем рядом.
          </p>
          <div className="permission-list">
            <p>
              <Video size={19} /> Камера — чтобы видеть друг друга
            </p>
            <p>
              <Mic size={19} /> Микрофон — чтобы слышать друг друга
            </p>
            <p>
              <ShieldCheck size={19} /> «Стоп» отключит ваши устройства
            </p>
          </div>
          <label className="consent">
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
            />
            <span>
              Мне исполнилось 18 лет. Я принимаю правила: общаться уважительно,
              не показывать откровенный контент и не рассылать спам.
            </span>
          </label>
          <button
            className="modal-primary"
            disabled={!ageChecked}
            onClick={confirmStart}
          >
            Включить камеру и начать <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {dialog === "settings" && (
        <Modal title="Ваши настройки" onClose={() => setDialog(null)}>
          <p className="modal-copy">
            Немного о вас — для подходящих знакомств.
          </p>
          <label className="settings-field">
            Ваша страна
            <select
              disabled={active}
              value={chat.profile.country}
              onChange={(e) =>
                chat.updateProfile({ ...chat.profile, country: e.target.value })
              }
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <small>
              Вы выбираете страну сами. Геолокация не запрашивается.
            </small>
          </label>
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
          {active && (
            <p className="settings-note">
              Чтобы изменить страну, сначала нажмите «Стоп».
            </p>
          )}
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
              выбранная страна, пол, состояние очереди и идентификатор
              соединения.
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

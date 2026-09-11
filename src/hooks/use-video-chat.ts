"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { io, type Socket } from "socket.io-client";
import {
  defaultProfile,
  type ClientEvents,
  type ServerEvents,
  type Profile,
  type Stats,
  type Match,
  type ChatMessage,
  type Signal,
} from "@/lib/protocol";

export type ChatStatus =
  "idle" | "requesting" | "searching" | "connecting" | "connected";
type ChatSocket = Socket<ServerEvents, ClientEvents>;
const subscribeToSecurity = () => () => {};

function mediaError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError")
      return "Разрешите доступ к камере и микрофону в настройках браузера, затем нажмите «Старт».";
    if (error.name === "NotFoundError")
      return "Камера или микрофон не найдены. Подключите устройства и попробуйте снова.";
    if (error.name === "NotReadableError")
      return "Камера занята другим приложением. Закройте его и попробуйте снова.";
  }
  return "Не удалось включить камеру. Проверьте подключение устройств и разрешения браузера.";
}

export function useVideoChat() {
  const secureContext = useSyncExternalStore(
    subscribeToSecurity,
    () => window.isSecureContext,
    () => true,
  );
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [serverConnected, setServerConnected] = useState(false);
  const [stats, setStats] = useState<Stats>({
    online: 0,
    searching: 0,
    conversations: 0,
  });
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const matchRef = useRef<Match | null>(null);
  const activeRef = useRef(false);
  const operationRef = useRef(0);
  const profileRef = useRef<Profile>(defaultProfile);
  const configRef = useRef<{
    iceServers: RTCIceServer[];
    relayConfigured: boolean;
  }>({ iceServers: [], relayConfigured: false });
  const candidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalChainRef = useRef<Promise<void>>(Promise.resolve());

  const closePeer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.ontrack = pc.onicecandidate = pc.onconnectionstatechange = null;
      pc.close();
    }
    candidatesRef.current = [];
    matchRef.current = null;
    setRemoteStream(null);
    setMatch(null);
    setElapsed(0);
  }, []);

  const releaseMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null);
    setMicOn(true);
    setCameraOn(true);
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    operationRef.current++;
    if (socketRef.current?.connected) socketRef.current.emit("stop");
    closePeer();
    releaseMedia();
    setStatus("idle");
  }, [closePeer, releaseMedia]);

  const search = useCallback(
    (socket: ChatSocket) => {
      if (!socket.connected || !activeRef.current || !streamRef.current) return;
      const operation = operationRef.current;
      setStatus("searching");
      socket
        .timeout(8_000)
        .emit("search", profileRef.current, (error, result) => {
          if (!activeRef.current || operationRef.current !== operation) return;
          if (error || !result.ok) {
            stop();
            setNotice(
              error
                ? "Сервер не ответил. Попробуйте начать поиск снова."
                : result.error || "Не удалось начать поиск.",
            );
          }
        });
    },
    [stop],
  );

  useEffect(() => {
    const operation = operationRef;
    const socket: ChatSocket = io({
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    function failConnection() {
      if (!activeRef.current) return;
      const relay = configRef.current.relayConfigured;
      stop();
      setNotice(
        relay
          ? "Не удалось соединиться с собеседником. Проверьте интернет и начните новый поиск."
          : "Не удалось установить видеосвязь. Возможно, сеть блокирует прямое соединение. Для таких сетей владельцу сервера нужно настроить TURN.",
      );
    }

    socket.on("ready", (config) => {
      configRef.current = config;
      profileRef.current = { ...profileRef.current, country: config.country };
      setProfile(profileRef.current);
      setServerConnected(true);
      setNotice("");
      if (activeRef.current && streamRef.current) search(socket);
    });
    socket.on("stats", setStats);
    socket.on("connect_error", () => {
      setServerConnected(false);
      setNotice("Нет связи с сервером. Переподключаемся…");
    });
    socket.on("disconnect", () => {
      setServerConnected(false);
      closePeer();
      if (activeRef.current) {
        setStatus("searching");
        setNotice("Соединение прервалось. Восстанавливаем связь с сервером…");
      }
    });
    socket.on("waiting", () => {
      if (!activeRef.current) {
        socket.emit("stop");
        return;
      }
      closePeer();
      setStatus("searching");
    });
    socket.on("peer-left", (data) => {
      if (matchRef.current?.sessionId !== data.sessionId) return;
      closePeer();
      setNotice(data.reason);
    });
    socket.on("matched", async (nextMatch) => {
      if (!activeRef.current || !streamRef.current) {
        socket.emit("stop");
        return;
      }
      closePeer();
      matchRef.current = nextMatch;
      setMatch(nextMatch);
      setMessages([]);
      setSending(false);
      setNotice("");
      setStatus("connecting");
      const pc = new RTCPeerConnection({
        iceServers: configRef.current.iceServers,
      });
      pcRef.current = pc;
      signalChainRef.current = Promise.resolve();
      streamRef.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, streamRef.current!));
      pc.ontrack = (event) => {
        if (pcRef.current !== pc) return;
        const incoming = event.streams[0];
        if (incoming) setRemoteStream(incoming);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && pcRef.current === pc && socket.connected)
          socket.emit("signal", {
            sessionId: nextMatch.sessionId,
            candidate: event.candidate.toJSON(),
          });
      };
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        if (pc.connectionState === "connected") {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (disconnectTimerRef.current)
            clearTimeout(disconnectTimerRef.current);
          setStatus("connected");
          setNotice("");
        } else if (pc.connectionState === "failed") {
          failConnection();
        } else if (pc.connectionState === "disconnected") {
          setNotice(
            "Связь с собеседником нестабильна. Восстанавливаем соединение…",
          );
          if (disconnectTimerRef.current)
            clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = setTimeout(failConnection, 12_000);
        }
      };
      timeoutRef.current = setTimeout(failConnection, 25_000);
      if (nextMatch.initiator) {
        try {
          const offer = await pc.createOffer();
          if (pcRef.current !== pc) return;
          await pc.setLocalDescription(offer);
          if (pcRef.current === pc)
            socket.emit("signal", {
              sessionId: nextMatch.sessionId,
              description: { type: "offer", sdp: offer.sdp },
            });
        } catch {
          if (pcRef.current === pc) failConnection();
        }
      }
    });
    socket.on("signal", (data: Signal) => {
      const pc = pcRef.current;
      if (!pc || data.sessionId !== matchRef.current?.sessionId) return;
      signalChainRef.current = signalChainRef.current
        .then(async () => {
          if (pcRef.current !== pc) return;
          if (data.description) {
            await pc.setRemoteDescription(data.description);
            if (pcRef.current !== pc) return;
            for (const candidate of candidatesRef.current.splice(0)) {
              await pc.addIceCandidate(candidate);
              if (pcRef.current !== pc) return;
            }
            if (data.description.type === "offer") {
              const answer = await pc.createAnswer();
              if (pcRef.current !== pc) return;
              await pc.setLocalDescription(answer);
              if (pcRef.current === pc)
                socket.emit("signal", {
                  sessionId: data.sessionId,
                  description: { type: "answer", sdp: answer.sdp },
                });
            }
          } else if (data.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
            else if (candidatesRef.current.length < 100)
              candidatesRef.current.push(data.candidate);
          }
        })
        .catch(() => {
          if (pcRef.current === pc) failConnection();
        });
    });
    socket.on("message", (message) => {
      if (message.sessionId === matchRef.current?.sessionId)
        setMessages((current) => [...current.slice(-199), message]);
    });
    socket.on("server-error", setNotice);
    socket.connect();
    return () => {
      activeRef.current = false;
      operation.current++;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      closePeer();
      releaseMedia();
    };
  }, [closePeer, releaseMedia, search, stop]);

  useEffect(() => {
    if (status !== "connected") return;
    const start = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [status]);

  async function start() {
    if (!window.isSecureContext) {
      setNotice(
        "Камера и микрофон недоступны по внешнему HTTP-адресу. Откройте сайт по HTTPS. Для локальной проверки подходит http://localhost:3005.",
      );
      return;
    }
    const socket = socketRef.current;
    if (!socket?.connected || !serverConnected || activeRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice(
        "Для доступа к камере откройте приложение по HTTPS или на localhost.",
      );
      return;
    }
    const operation = ++operationRef.current;
    activeRef.current = true;
    setStatus("requesting");
    setNotice("");
    setMessages([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (operationRef.current !== operation || !activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setLocalStream(stream);
      for (const track of stream.getTracks())
        track.onended = () => {
          if (streamRef.current !== stream) return;
          stop();
          setNotice(
            "Устройство отключено или доступ к нему отозван. Проверьте камеру и микрофон.",
          );
        };
      search(socket);
      if (!socket.connected) setStatus("searching");
    } catch (error) {
      if (operationRef.current !== operation) return;
      stop();
      setNotice(mediaError(error));
    }
  }

  function nextPeer(block = false) {
    const current = matchRef.current;
    const socket = socketRef.current;
    if (!current || !socket?.connected) return;
    const operation = operationRef.current;
    socket
      .timeout(8_000)
      .emit(
        "next",
        { sessionId: current.sessionId, block },
        (error, result) => {
          if (operationRef.current !== operation || !activeRef.current) return;
          if (error) {
            stop();
            setNotice("Сервер не ответил. Начните поиск снова.");
          } else if (!result.ok)
            setNotice(result.error || "Не удалось переключить собеседника.");
          else if (block)
            setNotice(
              "Собеседник заблокирован до его переподключения. Ищем нового.",
            );
        },
      );
  }

  async function sendMessage(text: string): Promise<boolean> {
    const current = matchRef.current;
    const socket = socketRef.current;
    if (!current || !socket?.connected || !text.trim() || sending) return false;
    setSending(true);
    return new Promise((resolve) => {
      socket
        .timeout(5_000)
        .emit(
          "message",
          { sessionId: current.sessionId, text },
          (error, result) => {
            setSending(false);
            if (matchRef.current?.sessionId !== current.sessionId) {
              resolve(false);
              return;
            }
            if (error || !result.ok) {
              setNotice(
                error
                  ? "Доставка сообщения не подтверждена."
                  : result.error || "Не удалось отправить сообщение.",
              );
              resolve(false);
            } else resolve(true);
          },
        );
    });
  }

  function updateProfile(next: Profile) {
    if (activeRef.current) return;
    profileRef.current = { ...next, country: profileRef.current.country };
    setProfile(profileRef.current);
  }
  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }
  function toggleCamera() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    }
  }

  return {
    secureContext,
    status,
    serverConnected,
    stats,
    profile,
    updateProfile,
    localStream,
    remoteStream,
    match,
    messages,
    notice,
    clearNotice: () => setNotice(""),
    micOn,
    cameraOn,
    elapsed,
    sending,
    start,
    stop,
    nextPeer,
    sendMessage,
    toggleMic,
    toggleCamera,
  };
}

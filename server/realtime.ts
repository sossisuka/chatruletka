import { createHmac, randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { isAllowedOrigin } from "./origin";
import {
  countries,
  type ClientEvents,
  type ServerEvents,
  type Profile,
  type Signal,
  type Stats,
} from "../src/lib/protocol";

type Peer = {
  socket: Socket<ClientEvents, ServerEvents>;
  profile: Profile | null;
  partner: string | null;
  sessionId: string | null;
  previous: string | null;
  blocked: Set<string>;
  limits: Map<string, { count: number; until: number }>;
};
type Options = {
  allowedOrigins?: string[];
  iceServers?: RTCIceServer[];
  turnUrls?: string[];
  turnSecret?: string;
  maxConnectionsPerIp?: number;
};
const countryCodes = new Set<string>(countries.map((c) => c.code));

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Profile;
  return (
    countryCodes.has(p.country) &&
    (p.lookingForCountry === "all" || countryCodes.has(p.lookingForCountry)) &&
    ["male", "female", "other"].includes(p.gender)
  );
}

function isSignal(value: unknown): value is Signal {
  if (!value || typeof value !== "object") return false;
  const s = value as Signal;
  if (typeof s.sessionId !== "string") return false;
  if (s.description)
    return (
      ["offer", "answer"].includes(s.description.type) &&
      typeof s.description.sdp === "string" &&
      s.description.sdp.length <= 48_000
    );
  if (s.candidate)
    return (
      typeof s.candidate.candidate === "string" &&
      s.candidate.candidate.length < 2_000 &&
      (s.candidate.sdpMid == null || typeof s.candidate.sdpMid === "string") &&
      (s.candidate.sdpMLineIndex == null ||
        Number.isInteger(s.candidate.sdpMLineIndex))
    );
  return false;
}

export function createRealtime(httpServer: HttpServer, options: Options = {}) {
  const peers = new Map<string, Peer>();
  const queue = new Set<string>();
  const ipCounts = new Map<string, number>();
  const io = new Server<ClientEvents, ServerEvents>(httpServer, {
    maxHttpBufferSize: 64_000,
    pingTimeout: 15_000,
    pingInterval: 10_000,
    serveClient: false,
    allowRequest: (req, done) => {
      done(null, isAllowedOrigin(req, options.allowedOrigins));
    },
  });

  function stats(): Stats {
    return {
      online: peers.size,
      searching: queue.size,
      conversations: [...peers.values()].filter((p) => p.partner).length / 2,
    };
  }
  function publishStats() {
    io.emit("stats", stats());
  }
  function allowed(p: Peer, key: string, max: number, interval = 10_000) {
    const now = Date.now();
    let bucket = p.limits.get(key);
    if (!bucket || bucket.until < now) {
      bucket = { count: 0, until: now + interval };
      p.limits.set(key, bucket);
    }
    return ++bucket.count <= max;
  }
  function compatible(a: Peer, b: Peer) {
    return (
      a !== b &&
      a.profile &&
      b.profile &&
      !a.partner &&
      !b.partner &&
      a.previous !== b.socket.id &&
      b.previous !== a.socket.id &&
      !a.blocked.has(b.socket.id) &&
      !b.blocked.has(a.socket.id) &&
      (a.profile.lookingForCountry === "all" ||
        a.profile.lookingForCountry === b.profile.country) &&
      (b.profile.lookingForCountry === "all" ||
        b.profile.lookingForCountry === a.profile.country)
    );
  }
  function drain() {
    for (const id of queue) {
      const a = peers.get(id);
      if (!a || !a.socket.connected) {
        queue.delete(id);
        continue;
      }
      for (const candidate of queue) {
        const b = peers.get(candidate);
        if (!b || !b.socket.connected || !compatible(a, b)) continue;
        const sessionId = randomUUID();
        queue.delete(id);
        queue.delete(candidate);
        a.partner = candidate;
        b.partner = id;
        a.sessionId = b.sessionId = sessionId;
        a.socket.emit("matched", {
          sessionId,
          initiator: true,
          peer: { country: b.profile!.country, gender: b.profile!.gender },
        });
        b.socket.emit("matched", {
          sessionId,
          initiator: false,
          peer: { country: a.profile!.country, gender: a.profile!.gender },
        });
        break;
      }
    }
    publishStats();
  }
  function detach(p: Peer, reason: string) {
    queue.delete(p.socket.id);
    const partner = p.partner && peers.get(p.partner);
    const sessionId = p.sessionId;
    if (partner && sessionId) {
      p.previous = partner.socket.id;
      partner.previous = p.socket.id;
      partner.partner = partner.sessionId = null;
      partner.socket.emit("peer-left", { sessionId, reason });
      if (partner.socket.connected && partner.profile) {
        queue.add(partner.socket.id);
        partner.socket.emit("waiting");
      }
    }
    p.partner = p.sessionId = null;
  }

  io.use((socket, next) => {
    const address = socket.handshake.address;
    if ((ipCounts.get(address) ?? 0) >= (options.maxConnectionsPerIp ?? 30))
      return next(
        new Error("Слишком много подключений из одной сети. Попробуйте позже."),
      );
    next();
  });

  io.on("connection", (socket) => {
    const address = socket.handshake.address;
    ipCounts.set(address, (ipCounts.get(address) ?? 0) + 1);
    const p: Peer = {
      socket,
      profile: null,
      partner: null,
      sessionId: null,
      previous: null,
      blocked: new Set(),
      limits: new Map(),
    };
    peers.set(socket.id, p);
    const iceServers: RTCIceServer[] = [
      ...(options.iceServers ?? [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
      ]),
    ];
    if (options.turnSecret && options.turnUrls?.length) {
      const username = `${Math.floor(Date.now() / 1000) + 86_400}:${socket.id}`;
      iceServers.push({
        urls: options.turnUrls,
        username,
        credential: createHmac("sha1", options.turnSecret)
          .update(username)
          .digest("base64"),
      });
    }
    socket.emit("ready", {
      iceServers,
      relayConfigured: iceServers.some((s) =>
        (Array.isArray(s.urls) ? s.urls : [s.urls]).some((url) =>
          /^turns?:/.test(url),
        ),
      ),
    });
    publishStats();

    socket.on("search", (profile, ack) => {
      if (typeof ack !== "function") return;
      if (!isProfile(profile))
        return ack({
          ok: false,
          error: "Проверьте страну и настройки поиска.",
        });
      if (!allowed(p, "search", 8))
        return ack({
          ok: false,
          error: "Слишком частые запросы. Подождите 10 секунд.",
        });
      if (p.partner)
        return ack({ ok: false, error: "Сначала завершите текущий разговор." });
      p.profile = {
        country: profile.country,
        gender: profile.gender,
        lookingForCountry: profile.lookingForCountry,
      };
      queue.add(socket.id);
      socket.emit("waiting");
      ack({ ok: true });
      drain();
    });
    socket.on("stop", () => {
      detach(p, "Собеседник завершил разговор.");
      p.profile = null;
      drain();
    });
    socket.on("next", (data, ack) => {
      if (typeof ack !== "function") return;
      if (!data || !p.partner || !p.sessionId || data.sessionId !== p.sessionId)
        return ack({ ok: false, error: "Этот разговор уже завершён." });
      if (!allowed(p, "search", 8))
        return ack({
          ok: false,
          error: "Подождите 10 секунд перед следующим поиском.",
        });
      if (data.block) {
        if (p.blocked.size >= 100)
          p.blocked.delete(p.blocked.values().next().value!);
        p.blocked.add(p.partner);
      }
      detach(p, "Собеседник перешёл к следующему разговору.");
      queue.add(socket.id);
      socket.emit("waiting");
      ack({ ok: true });
      drain();
    });
    socket.on("signal", (data) => {
      if (
        !isSignal(data) ||
        !p.partner ||
        data.sessionId !== p.sessionId ||
        !allowed(p, "signal", 300)
      )
        return;
      peers.get(p.partner)?.socket.emit("signal", {
        sessionId: p.sessionId!,
        ...(data.description
          ? { description: data.description }
          : { candidate: data.candidate }),
      });
    });
    socket.on("message", (data, ack) => {
      if (typeof ack !== "function") return;
      if (!data || !p.partner || data.sessionId !== p.sessionId)
        return ack({ ok: false, error: "Собеседник уже отключился." });
      if (
        typeof data.text !== "string" ||
        !data.text.trim() ||
        data.text.length > 2_000
      )
        return ack({
          ok: false,
          error: "Сообщение должно содержать от 1 до 2000 символов.",
        });
      if (!allowed(p, "message", 12))
        return ack({
          ok: false,
          error: "Слишком много сообщений. Немного подождите.",
        });
      const message = {
        id: randomUUID(),
        sessionId: p.sessionId!,
        text: data.text.trim(),
        sentAt: Date.now(),
      };
      socket.emit("message", { ...message, mine: true });
      peers.get(p.partner)?.socket.emit("message", { ...message, mine: false });
      ack({ ok: true });
    });
    socket.on("disconnect", () => {
      detach(p, "Собеседник отключился. Ищем нового.");
      peers.delete(socket.id);
      for (const peer of peers.values()) peer.blocked.delete(socket.id);
      const count = (ipCounts.get(address) ?? 1) - 1;
      if (count > 0) ipCounts.set(address, count);
      else ipCounts.delete(address);
      drain();
    });
  });
  return { io, stats };
}

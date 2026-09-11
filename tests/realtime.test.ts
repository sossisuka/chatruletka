import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { io, type Socket } from "socket.io-client";
import { createRealtime } from "../server/realtime";
import { isAllowedOrigin } from "../server/origin";
import { createCountryLookup } from "../server/geolocation";
import {
  defaultProfile,
  type Ack,
  type ChatMessage,
  type ClientEvents,
  type Match,
  type Profile,
  type ServerEvents,
  type Signal,
} from "../src/lib/protocol";

const origin = "http://localhost:4173";
let server: ReturnType<typeof createServer>;
let realtime: ReturnType<typeof createRealtime>;
let url: string;
let sockets: Socket<ServerEvents, ClientEvents>[];
let detectedCountries: Map<string, string>;

async function until(predicate: () => boolean, timeout = 3000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error("Timed out waiting for event");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

beforeEach(async () => {
  sockets = [];
  detectedCountries = new Map();
  server = createServer();
  realtime = createRealtime(server, {
    allowedOrigins: [origin],
    iceServers: [],
    turnUrls: ["turn:relay.example.com:3478"],
    turnSecret: "test-only-secret",
    trustProxy: true,
    maxConnectionsPerIp: 3,
    lookupCountry: createCountryLookup({
      token: "test-only-2ip-token",
      minIntervalMs: 0,
      fetcher: async (input) => {
        const ip = decodeURIComponent(new URL(String(input)).pathname.slice(1));
        return Response.json({ ip, code: detectedCountries.get(ip) ?? "ZZ" });
      },
    }),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No server address");
  url = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  sockets.forEach((socket) => socket.disconnect());
  await new Promise<void>((resolve) => realtime.io.close(() => resolve()));
});

async function visitor(
  headers: Record<string, string> = { Origin: origin },
  transport = "websocket",
) {
  const socket: Socket<ServerEvents, ClientEvents> = io(url, {
    transports: [transport],
    extraHeaders: headers,
    autoConnect: false,
    reconnection: false,
  });
  sockets.push(socket);
  const events = {
    matches: [] as Match[],
    messages: [] as ChatMessage[],
    signals: [] as Signal[],
    waiting: 0,
    left: 0,
    ready: null as {
      iceServers: RTCIceServer[];
      relayConfigured: boolean;
      country: string;
    } | null,
  };
  socket.on("matched", (data) => events.matches.push(data));
  socket.on("message", (data) => events.messages.push(data));
  socket.on("signal", (data) => events.signals.push(data));
  socket.on("waiting", () => events.waiting++);
  socket.on("peer-left", () => events.left++);
  socket.on("ready", (data) => {
    events.ready = data;
  });
  socket.connect();
  await until(() => !!events.ready);
  const search = (profile: Profile = defaultProfile) =>
    new Promise<Ack>((resolve) => socket.emit("search", profile, resolve));
  return { socket, events, search };
}

test("the first visitor waits; a real second visitor creates one isolated pair", async () => {
  const a = await visitor();
  assert.deepEqual(await a.search(), { ok: true });
  assert.equal(realtime.stats().searching, 1);
  assert.equal(a.events.matches.length, 0);
  const b = await visitor();
  await b.search();
  await until(
    () => a.events.matches.length === 1 && b.events.matches.length === 1,
  );
  assert.equal(a.events.matches[0].sessionId, b.events.matches[0].sessionId);
  assert.notEqual(a.events.matches[0].initiator, b.events.matches[0].initiator);
  assert.deepEqual(realtime.stats(), {
    online: 2,
    searching: 0,
    conversations: 1,
  });
});

test("country preferences are enforced in both directions", async () => {
  detectedCountries.set("8.8.8.8", "RU");
  detectedCountries.set("1.1.1.1", "DE");
  const a = await visitor({ Origin: origin, "X-Forwarded-For": "8.8.8.8" });
  const b = await visitor({ Origin: origin, "X-Forwarded-For": "1.1.1.1" });
  const c = await visitor({ Origin: origin, "X-Forwarded-For": "1.1.1.1" });
  await a.search({ ...defaultProfile, country: "RU", lookingForCountry: "DE" });
  await b.search({ ...defaultProfile, country: "DE", lookingForCountry: "US" });
  assert.equal(realtime.stats().conversations, 0);
  await c.search({ ...defaultProfile, country: "DE", lookingForCountry: "RU" });
  await until(
    () => c.events.matches.length === 1 && a.events.matches.length === 1,
  );
  assert.equal(a.events.matches[0].sessionId, c.events.matches[0].sessionId);
  assert.equal(b.events.matches.length, 0);
  assert.equal(realtime.stats().searching, 1);
  assert.equal(a.events.ready!.country, "RU");
  assert.equal(JSON.stringify(a.events.ready).includes("test-only-2ip-token"), false);
  assert.equal(JSON.stringify(a.events.ready).includes("8.8.8.8"), false);
  assert.equal(a.events.matches[0].peer.country, "DE");
});

test("client country spoofing cannot affect matching or the country shown to peers", async () => {
  detectedCountries.set("8.8.8.8", "FR");
  const a = await visitor({ Origin: origin, "X-Forwarded-For": "9.9.9.9, 8.8.8.8" });
  const b = await visitor();
  await a.search({ ...defaultProfile, country: "DE" });
  await b.search({ ...defaultProfile, lookingForCountry: "DE" });
  assert.equal(realtime.stats().conversations, 0);
  await b.search({ ...defaultProfile, lookingForCountry: "OTHER" });
  await until(() => a.events.matches.length === 1 && b.events.matches.length === 1);
  assert.equal(a.events.ready!.country, "FR");
  assert.equal(b.events.matches[0].peer.country, "FR");
  assert.equal(a.events.matches[0].peer.country, "UNKNOWN");
});

test("unavailable geolocation never falls back to a self-declared country", async () => {
  const a = await visitor({ Origin: origin, "X-Forwarded-For": "8.8.8.8" });
  const b = await visitor();
  await a.search({ ...defaultProfile, country: "RU" });
  for (const filter of ["RU", "OTHER"]) {
    await b.search({ ...defaultProfile, lookingForCountry: filter });
    assert.equal(realtime.stats().conversations, 0);
  }
  await b.search();
  await until(() => b.events.matches.length === 1);
  assert.equal(b.events.matches[0].peer.country, "UNKNOWN");
});

test("connection limits use the visitor IP behind nginx and release it on disconnect", async () => {
  const headers = { Origin: origin, "X-Forwarded-For": "8.8.8.8" };
  const a = await visitor(headers);
  await visitor(headers);
  await visitor(headers);
  const blocked = io(url, {
    transports: ["websocket"], extraHeaders: headers,
    autoConnect: false, reconnection: false,
  });
  sockets.push(blocked);
  const rejected = new Promise<string>((resolve) =>
    blocked.on("connect_error", (error) => resolve(error.message)));
  blocked.connect();
  assert.match(await rejected, /Слишком много подключений/);
  const differentIp = await visitor({ Origin: origin, "X-Forwarded-For": "1.1.1.1" });
  assert.equal(differentIp.socket.connected, true);
  a.socket.disconnect();
  await until(() => realtime.stats().online === 3);
  const replacement = await visitor(headers);
  assert.equal(replacement.socket.connected, true);
});

test("messages and SDP reach only the current peer; spoofed and stale sessions are rejected", async () => {
  const a = await visitor();
  const b = await visitor();
  const spy = await visitor();
  await a.search();
  await b.search();
  await until(() => a.events.matches.length === 1);
  const sessionId = a.events.matches[0].sessionId;
  const ack = await new Promise<Ack>((resolve) =>
    a.socket.emit(
      "message",
      { sessionId, text: "Привет <script>alert(1)</script>" },
      resolve,
    ),
  );
  assert.equal(ack.ok, true);
  await until(
    () => b.events.messages.length === 1 && a.events.messages.length === 1,
  );
  assert.equal(b.events.messages[0].mine, false);
  assert.equal(a.events.messages[0].mine, true);
  assert.equal(spy.events.messages.length, 0);
  a.socket.emit("signal", {
    sessionId,
    description: { type: "offer", sdp: "v=0" },
  });
  await until(() => b.events.signals.length === 1);
  spy.socket.emit("signal", {
    sessionId,
    description: { type: "offer", sdp: "spoof" },
  });
  const rejected = await new Promise<Ack>((resolve) =>
    spy.socket.emit("message", { sessionId, text: "spy" }, resolve),
  );
  assert.equal(rejected.ok, false);
  a.socket.emit("stop");
  await until(() => b.events.left === 1);
  const stale = await new Promise<Ack>((resolve) =>
    a.socket.emit("message", { sessionId, text: "stale" }, resolve),
  );
  assert.equal(stale.ok, false);
  assert.equal(b.events.signals.length, 1);
  assert.equal(spy.events.signals.length, 0);
});

test("next matches a third waiting visitor, requeues the previous peer, and ignores stale next", async () => {
  const a = await visitor();
  const b = await visitor();
  const c = await visitor();
  await a.search();
  await b.search();
  await c.search();
  await until(() => a.events.matches.length === 1);
  const oldSession = a.events.matches[0].sessionId;
  const result = await new Promise<Ack>((resolve) =>
    a.socket.emit("next", { sessionId: oldSession }, resolve),
  );
  assert.equal(result.ok, true);
  await until(
    () =>
      c.events.matches.length === 1 &&
      (a.events.matches.length === 2 || b.events.matches.length === 2),
  );
  assert.equal(realtime.stats().conversations, 1);
  assert.equal(realtime.stats().searching, 1);
  // Queue fairness can give the waiting third visitor to either former peer.
  const paired = a.events.matches.length === 2 ? a : b;
  const waiting = paired === a ? b : a;
  assert.equal(
    paired.events.matches.at(-1)!.sessionId,
    c.events.matches[0].sessionId,
  );
  assert.equal(waiting.events.matches.length, 1);
  const stale = await new Promise<Ack>((resolve) =>
    a.socket.emit("next", { sessionId: oldSession }, resolve),
  );
  assert.equal(stale.ok, false);
});

test("two visitors do not immediately rematch after next; stop removes the search entry", async () => {
  const a = await visitor();
  const b = await visitor();
  await a.search();
  await b.search();
  await until(() => a.events.matches.length === 1);
  await new Promise<Ack>((resolve) =>
    a.socket.emit(
      "next",
      { sessionId: a.events.matches[0].sessionId },
      resolve,
    ),
  );
  assert.equal(realtime.stats().conversations, 0);
  assert.equal(realtime.stats().searching, 2);
  a.socket.emit("stop");
  await until(() => realtime.stats().searching === 1);
  a.socket.disconnect();
  b.socket.disconnect();
  await until(() => realtime.stats().online === 0);
  assert.equal(realtime.stats().searching, 0);
});

test("disconnect requeues survivor and removes ghosts", async () => {
  const a = await visitor();
  const b = await visitor();
  await a.search();
  await b.search();
  await until(() => a.events.matches.length === 1);
  b.socket.disconnect();
  await until(() => a.events.left === 1);
  assert.deepEqual(realtime.stats(), {
    online: 1,
    searching: 1,
    conversations: 0,
  });
  const c = await visitor();
  await c.search();
  await until(
    () => a.events.matches.length === 2 && c.events.matches.length === 1,
  );
  assert.equal(a.events.matches[1].sessionId, c.events.matches[0].sessionId);
});

test("session blocking prevents a later rematch even after both peers meet someone else", async () => {
  const a = await visitor();
  const b = await visitor();
  await a.search();
  await b.search();
  await until(
    () => a.events.matches.length === 1 && b.events.matches.length === 1,
  );
  const result = await new Promise<Ack>((resolve) =>
    a.socket.emit(
      "next",
      { sessionId: a.events.matches[0].sessionId, block: true },
      resolve,
    ),
  );
  assert.equal(result.ok, true);
  const c = await visitor();
  await c.search();
  await until(
    () => c.events.matches.length === 1 && b.events.matches.length === 2,
  );
  b.socket.emit("stop");
  await until(
    () => a.events.matches.length === 2 && c.events.matches.length === 2,
  );
  c.socket.emit("stop");
  await until(() => realtime.stats().conversations === 0);
  await b.search();
  assert.equal(realtime.stats().searching, 2);
  assert.equal(realtime.stats().conversations, 0);
});

test("malformed profiles, empty/oversized messages and floods are rejected", async () => {
  const a = await visitor();
  const b = await visitor();
  assert.equal(
    (await a.search({ ...defaultProfile, lookingForCountry: "INVALID" })).ok,
    false,
  );
  await a.search();
  await b.search();
  await until(() => a.events.matches.length === 1);
  const sessionId = a.events.matches[0].sessionId;
  for (const text of ["", "  ", "x".repeat(2001)]) {
    assert.equal(
      (
        await new Promise<Ack>((resolve) =>
          a.socket.emit("message", { sessionId, text }, resolve),
        )
      ).ok,
      false,
    );
  }
  for (let i = 0; i < 12; i++)
    assert.equal(
      (
        await new Promise<Ack>((resolve) =>
          a.socket.emit("message", { sessionId, text: "test" }, resolve),
        )
      ).ok,
      true,
    );
  assert.equal(
    (
      await new Promise<Ack>((resolve) =>
        a.socket.emit("message", { sessionId, text: "flood" }, resolve),
      )
    ).ok,
    false,
  );
});

test("same-origin polling works without Origin; foreign origins are denied", async () => {
  const polling = await visitor({ Referer: `${origin}/` }, "polling");
  assert.equal(polling.socket.connected, true);
  const bad = io(url, {
    transports: ["websocket"],
    extraHeaders: { Origin: "https://foreign.invalid" },
    reconnection: false,
    autoConnect: false,
  });
  sockets.push(bad);
  const rejected = new Promise<void>((resolve) =>
    bad.on("connect_error", () => resolve()),
  );
  bad.connect();
  await rejected;
  assert.equal(realtime.stats().online, 1);
});

test("TURN credentials expire and never reveal the shared secret", async () => {
  const a = await visitor();
  const config = a.events.ready!;
  assert.equal(config.relayConfigured, true);
  const turn = config.iceServers[0];
  assert.ok(Number(turn.username!.split(":")[0]) > Date.now() / 1000);
  assert.equal(
    turn.credential,
    createHmac("sha1", "test-only-secret")
      .update(turn.username!)
      .digest("base64"),
  );
  assert.equal(JSON.stringify(config).includes("test-only-secret"), false);
});

test("default policy accepts the same public IP, LAN host and HTTPS proxy host", () => {
  for (const address of [
    "http://185.128.200.106:3005",
    "http://192.168.10.50:3005",
    "http://localhost:3005",
    "https://chat.example.com",
  ]) {
    const host = new URL(address).host;
    assert.equal(isAllowedOrigin({ headers: { host, origin: address } }), true);
    assert.equal(
      isAllowedOrigin({ headers: { host, referer: `${address}/` } }),
      true,
    );
  }
  assert.equal(
    isAllowedOrigin({
      headers: { host: "chat.example.com", "sec-fetch-site": "same-origin" },
    }),
    true,
  );
});

test("default policy rejects cross-origin requests, forwarded host spoofing and malformed origins", () => {
  for (const origin of [
    "https://foreign.invalid",
    "http://185.128.200.106:4000",
    "null",
    "not-a-url",
    "file:///etc/hosts",
    "http://user:pass@185.128.200.106:3005",
  ]) {
    assert.equal(
      isAllowedOrigin({
        headers: {
          host: "185.128.200.106:3005",
          origin,
          "x-forwarded-host": new URL("https://foreign.invalid").host,
        },
      }),
      false,
    );
  }
  assert.equal(
    isAllowedOrigin({ headers: { host: "185.128.200.106:3005" } }),
    false,
  );
  assert.equal(
    isAllowedOrigin(
      {
        headers: {
          host: "185.128.200.106:3005",
          origin: "http://185.128.200.106:3005",
        },
      },
      ["https://chat.example.com"],
    ),
    false,
  );
});

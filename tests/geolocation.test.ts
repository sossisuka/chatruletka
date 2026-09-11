import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { getClientIp, isPublicIp, normalizeIp } from "../server/client-ip";
import { createCountryLookup } from "../server/geolocation";
import { countryName } from "../src/lib/protocol";

function request(remoteAddress: string, forwarded?: string) {
  return {
    socket: { remoteAddress } as IncomingMessage["socket"],
    headers: forwarded ? { "x-forwarded-for": forwarded } : {},
  };
}

test("nginx IP extraction ignores forged prefixes and untrusted headers", () => {
  assert.equal(getClientIp(request("::ffff:172.18.0.1", "1.1.1.1, 8.8.8.8"), true), "8.8.8.8");
  assert.equal(getClientIp(request("127.0.0.1", "1.1.1.1")), "127.0.0.1");
  assert.equal(getClientIp(request("8.8.8.8", "1.1.1.1"), true), "8.8.8.8");
  assert.equal(getClientIp(request("127.0.0.1", "1.1.1.1, invalid"), true), "127.0.0.1");
  assert.equal(getClientIp(request("::1", "2001:4860:4860::8888"), true), "2001:4860:4860::8888");
  assert.equal(getClientIp(request("127.0.0.1"), true), "127.0.0.1");
});

test("IP normalization supports IPv6 and never geolocates local or reserved addresses", () => {
  assert.equal(normalizeIp("::FFFF:0808:0808"), "8.8.8.8");
  assert.equal(normalizeIp("2001:4860:4860:0:0:0:0:8888"), "2001:4860:4860::8888");
  for (const ip of ["", "localhost", "127.0.0.1", "::1", "::ffff:127.0.0.1", "10.0.0.1",
    "192.168.1.1", "172.18.0.1", "169.254.0.1", "100.64.1.1", "0.0.0.0",
    "192.0.2.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "::", "fe80::1", "fc00::1", "2001:db8::1"])
    assert.equal(isPublicIp(ip), false, ip);
  for (const ip of ["8.8.8.8", "::ffff:8.8.8.8", "2001:4860:4860::8888"])
    assert.equal(isPublicIp(ip), true, ip);
});

test("2ip receives the visitor IP and a private token, deduplicates and caches valid results", async () => {
  const calls: URL[] = [];
  const lookup = createCountryLookup({
    token: "test-only-token", minIntervalMs: 0,
    fetcher: async (input, init) => {
      calls.push(new URL(String(input)));
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      await delay(5);
      return Response.json({ ip: "8.8.8.8", code: "fr", country: "France" });
    },
  });
  assert.deepEqual(await Promise.all([lookup("8.8.8.8"), lookup("::ffff:8.8.8.8")]), ["FR", "FR"]);
  assert.equal(await lookup("8.8.8.8"), "FR");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].origin, "https://api.2ip.io");
  assert.equal(calls[0].pathname, "/8.8.8.8");
  assert.equal(calls[0].searchParams.get("token"), "test-only-token");
  assert.equal(countryName("FR"), "Франция");
});

test("2ip supports an IPv6 visitor", async () => {
  const ip = "2001:4860:4860::8888";
  const lookup = createCountryLookup({ token: "test", fetcher: async (input) => {
    assert.equal(decodeURIComponent(new URL(String(input)).pathname.slice(1)), ip);
    return Response.json({ ip, code: "US" });
  } });
  assert.equal(await lookup(ip), "US");
});

test("missing token and local addresses do not contact 2ip", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error("unexpected fetch"); };
  assert.equal(await createCountryLookup({ fetcher })("8.8.8.8"), null);
  assert.equal(await createCountryLookup({ token: "test", fetcher })("127.0.0.1"), null);
  assert.equal(calls, 0);
});

test("errors, malformed countries and a response for a different IP fail without inventing a country", async () => {
  for (const response of [
    Response.json({ ip: "1.1.1.1", code: "US" }),
    Response.json({ ip: "8.8.8.8", code: "ZZ" }),
    Response.json({ ip: "8.8.8.8", code: "USA" }),
    Response.json({ error: "quota" }),
    Response.json(null), new Response("broken json"), new Response("error", { status: 500 }),
  ]) {
    let calls = 0;
    const lookup = createCountryLookup({ token: "test", fetcher: async () => { calls++; return response; } });
    assert.equal(await lookup("8.8.8.8"), null);
    assert.equal(await lookup("8.8.8.8"), null);
    assert.equal(calls, 1);
  }
});

test("rate-limit and authentication failures stop further provider requests for a minute", async () => {
  for (const status of [401, 402, 403, 429]) {
    let calls = 0;
    const lookup = createCountryLookup({ token: "test", minIntervalMs: 0, fetcher: async () => {
      calls++;
      return new Response(null, { status });
    } });
    assert.equal(await lookup("8.8.8.8"), null);
    assert.equal(await lookup("1.1.1.1"), null);
    assert.equal(calls, 1);
  }
});

test("slow provider requests are aborted and chat can continue without a country", async () => {
  let aborted = false;
  const lookup = createCountryLookup({
    token: "test", timeoutMs: 15,
    fetcher: async (_input, init) => {
      try { await delay(1000, undefined, { signal: init?.signal ?? undefined }); }
      catch (error) { aborted = true; throw error; }
      return Response.json({});
    },
  });
  assert.equal(await lookup("8.8.8.8"), null);
  assert.equal(aborted, true);
});

test("successful cache entries expire and memory stays bounded", async () => {
  let calls = 0;
  const lookup = createCountryLookup({ token: "test", minIntervalMs: 0, cacheTtlMs: 15, maxEntries: 1,
    fetcher: async (input) => {
      calls++;
      return Response.json({ ip: new URL(String(input)).pathname.slice(1), code: "DE" });
    },
  });
  await lookup("8.8.8.8");
  await lookup("1.1.1.1");
  await lookup("8.8.8.8");
  assert.equal(calls, 3);
  await delay(20);
  assert.equal(await lookup("8.8.8.8"), "DE");
  assert.equal(calls, 4);
});

import { setTimeout as delay } from "node:timers/promises";
import { isCountryCode } from "../src/lib/protocol";
import { isPublicIp, normalizeIp } from "./client-ip";

type Options = {
  token?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxEntries?: number;
  minIntervalMs?: number;
};

// API reference: https://2ip.io/ru/api-docs/ (Geo: response.ip, response.code).
// Only IP and country are cached in memory; credentials never leave the server.
export function createCountryLookup(options: Options = {}) {
  const token = options.token?.trim();
  const fetcher = options.fetcher ?? fetch;
  const cache = new Map<string, { country: string | null; expires: number }>();
  const pending = new Map<string, Promise<string | null>>();
  let nextRequestAt = 0;
  let retryAfter = 0;

  async function requestCountry(ip: string): Promise<string | null> {
    const wait = Math.max(0, nextRequestAt - Date.now());
    nextRequestAt = Date.now() + wait + (options.minIntervalMs ?? 350);
    if (wait) await delay(wait);
    if (Date.now() < retryAfter) return null;
    const url = new URL(`https://api.2ip.io/${encodeURIComponent(ip)}`);
    url.searchParams.set("token", token!);
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(options.timeoutMs ?? 2500),
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) {
        // Avoid exhausting quota when the provider rejects this token/server.
        if ([401, 402, 403, 429].includes(response.status))
          retryAfter = Date.now() + 60_000;
        return null;
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") return null;
      const result = data as { ip?: unknown; code?: unknown };
      if (typeof result.ip !== "string" || normalizeIp(result.ip) !== ip)
        return null;
      const code = typeof result.code === "string" ? result.code.toUpperCase() : "";
      return isCountryCode(code) ? code : null;
    } catch {
      // Do not log the request URL: it contains the private API token.
      return null;
    }
  }

  return async function lookupCountry(address: string): Promise<string | null> {
    const ip = normalizeIp(address);
    if (!token || !ip || !isPublicIp(ip)) return null;
    const cached = cache.get(ip);
    if (cached && cached.expires > Date.now()) return cached.country;
    const inFlight = pending.get(ip);
    if (inFlight) return inFlight;
    // Bound both memory and wait time when many new IPs arrive together.
    if (Date.now() < retryAfter || pending.size >= 8) return null;
    const work = requestCountry(ip).then((country) => {
      cache.delete(ip);
      if (cache.size >= (options.maxEntries ?? 2048))
        cache.delete(cache.keys().next().value!);
      cache.set(ip, {
        country,
        expires: Date.now() + (country ? (options.cacheTtlMs ?? 3_600_000) : 60_000),
      });
      return country;
    }).finally(() => pending.delete(ip));
    pending.set(ip, work);
    return work;
  };
}

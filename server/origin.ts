import type { IncomingMessage } from "node:http";

/** Browser clients must originate from this host or an explicitly configured origin. */
export function isAllowedOrigin(
  request: Pick<IncomingMessage, "headers">,
  allowedOrigins: string[] = [],
) {
  const rawOrigin = request.headers.origin || request.headers.referer;
  if (!rawOrigin) {
    // Same-origin fetch may omit both Origin and Referer. This browser-controlled
    // header cannot be set by a cross-origin page. WebSocket always sends Origin.
    return (
      !allowedOrigins.length &&
      request.headers["sec-fetch-site"] === "same-origin"
    );
  }
  try {
    const origin = new URL(rawOrigin);
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password
    )
      return false;
    if (allowedOrigins.length) return allowedOrigins.includes(origin.origin);
    // Reverse proxies must preserve Host (Caddy does so by default). Never trust
    // arbitrary X-Forwarded-Host here. No wildcard CORS or external origins.
    return origin.host.toLowerCase() === request.headers.host?.toLowerCase();
  } catch {
    return false;
  }
}

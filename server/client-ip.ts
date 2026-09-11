import { BlockList, isIP } from "node:net";
import type { IncomingMessage } from "node:http";

const privateNetworks = new BlockList();
for (const [address, prefix] of [
  ["10.0.0.0", 8], ["127.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16],
] as const) privateNetworks.addSubnet(address, prefix, "ipv4");
privateNetworks.addAddress("::1", "ipv6");
privateNetworks.addSubnet("fc00::", 7, "ipv6");

const nonPublicNetworks = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["100.64.0.0", 10], ["169.254.0.0", 16],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) nonPublicNetworks.addSubnet(address, prefix, "ipv4");
nonPublicNetworks.addAddress("::", "ipv6");
nonPublicNetworks.addSubnet("fe80::", 10, "ipv6");
nonPublicNetworks.addSubnet("ff00::", 8, "ipv6");
nonPublicNetworks.addSubnet("2001:db8::", 32, "ipv6");

export function normalizeIp(value: string | undefined): string | null {
  const ip = value?.trim();
  if (!ip || ip.includes("%") || !isIP(ip)) return null;
  if (isIP(ip) === 4) return ip;
  const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([\da-f]+):([\da-f]+)$/.exec(normalized);
  if (!mapped) return normalized;
  const high = parseInt(mapped[1], 16);
  const low = parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

function isPrivate(ip: string) {
  return privateNetworks.check(ip, isIP(ip) === 4 ? "ipv4" : "ipv6");
}

export function isPublicIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return !!normalized && !isPrivate(normalized) && !nonPublicNetworks.check(
    normalized, isIP(normalized) === 4 ? "ipv4" : "ipv6",
  );
}

// One nginx/Caddy hop. Only trust a local/private proxy, and use the address
// it appended on the RIGHT, never a value supplied on the left by the visitor.
export function getClientIp(
  request: Pick<IncomingMessage, "headers" | "socket">,
  trustProxy = false,
): string | null {
  const direct = normalizeIp(request.socket.remoteAddress);
  if (!direct || !trustProxy || !isPrivate(direct)) return direct;
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded !== "string") return direct;
  return normalizeIp(forwarded.split(",").at(-1)) ?? direct;
}

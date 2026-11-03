/**
 * Works out the real client address. X-Forwarded-For is trivially spoofable,
 * so it is only read when the TCP peer is one of our own proxies, and then
 * walked right-to-left, skipping further trusted hops.
 */
import ipaddr from "ipaddr.js";
import type { IncomingMessage } from "node:http";

type Range = [ipaddr.IPv4 | ipaddr.IPv6, number];

export function normaliseIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (!ipaddr.isValid(v)) return null;
  return ipaddr.process(v).toString(); // also turns ::ffff:1.2.3.4 into 1.2.3.4
}

export function parseRange(cidr: string): Range {
  const v = cidr.trim();
  if (!v.includes("/")) {
    const addr = ipaddr.process(v);
    return [addr, addr.kind() === "ipv4" ? 32 : 128];
  }
  const [addr, bits] = ipaddr.parseCIDR(v);
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress() && bits >= 96) {
    return [(addr as ipaddr.IPv6).toIPv4Address(), bits - 96];
  }
  return [addr, bits];
}

export function inRange(ip: string, range: Range): boolean {
  const addr = ipaddr.process(ip);
  if (addr.kind() !== range[0].kind()) return false;
  return (addr as ipaddr.IPv4).match(range as [ipaddr.IPv4, number]);
}

/** Rate-limit/lockout key: IPv6 clients usually control a whole /64, so treat it as one client. */
export function ipKey(ip: string): string {
  const addr = ipaddr.process(ip);
  if (addr.kind() === "ipv4") return addr.toString();
  const parts = (addr as ipaddr.IPv6).parts.slice(0, 4).map((p) => p.toString(16));
  return `${parts.join(":")}::/64`;
}

export function hostCidr(ip: string): string {
  const addr = ipaddr.process(ip);
  return addr.kind() === "ipv4" ? `${addr.toString()}/32` : `${ipKey(ip).replace("::/64", "::")}/64`;
}

export class ClientIpResolver {
  private readonly trusted: Range[];

  constructor(
    trustedProxies: string[],
    private readonly header?: string,
  ) {
    this.trusted = trustedProxies.map(parseRange);
  }

  isTrustedProxy(ip: string): boolean {
    return this.trusted.some((r) => inRange(ip, r));
  }

  resolve(req: IncomingMessage): string {
    const peer = normaliseIp(req.socket.remoteAddress) ?? "0.0.0.0";
    if (!this.trusted.length || !this.isTrustedProxy(peer)) return peer;

    if (this.header) {
      const v = normaliseIp(String(req.headers[this.header] ?? "").split(",")[0]);
      if (v) return v;
    }
    const chain = String(req.headers["x-forwarded-for"] ?? "")
      .split(",")
      .map((s) => normaliseIp(s))
      .filter((s): s is string => !!s);
    for (let i = chain.length - 1; i >= 0; i--) {
      const hop = chain[i]!;
      if (!this.isTrustedProxy(hop)) return hop;
    }
    return chain[0] ?? peer;
  }
}

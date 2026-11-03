/**
 * Request limits per client address. The first matching specific rule AND
 * the global rule both apply. Limits are generous for real people (a whole
 * university can share one NAT address) and tight where abuse is cheap.
 */
export interface RatePolicy {
  name: string;
  limit: number;
  windowSec: number;
}

const MIN = 60;
const HOUR = 3600;

const rules: { method: string; pattern: RegExp; policy: RatePolicy }[] = [
  { method: "POST", pattern: /^\/api\/auth\/sign-in\//, policy: { name: "sign-in", limit: 10, windowSec: MIN } },
  { method: "POST", pattern: /^\/api\/auth\/two-factor\/verify/, policy: { name: "2fa", limit: 10, windowSec: 5 * MIN } },
  { method: "POST", pattern: /^\/api\/auth\/(request-password-reset|forget-password|reset-password)/, policy: { name: "password-reset", limit: 5, windowSec: 15 * MIN } },
  { method: "POST", pattern: /^\/api\/auth\/send-verification-email/, policy: { name: "verify-email", limit: 5, windowSec: 15 * MIN } },
  { method: "POST", pattern: /^\/api\/auth\/change-password/, policy: { name: "change-password", limit: 5, windowSec: 15 * MIN } },
  { method: "POST", pattern: /^\/api\/members\/register$/, policy: { name: "register", limit: 5, windowSec: HOUR } },
  { method: "POST", pattern: /^\/api\/(newsletter|contact|quotes)(\/|$)/, policy: { name: "public-form", limit: 10, windowSec: HOUR } },
  { method: "POST", pattern: /^\/api\/(events|conferences)\/[^/]+\/registrations$/, policy: { name: "event-registration", limit: 10, windowSec: HOUR } },
  { method: "POST", pattern: /^\/api\/(me\/photo|admin\/media)/, policy: { name: "upload", limit: 60, windowSec: HOUR } },
];

const GLOBAL_READ: RatePolicy = { name: "global-read", limit: 600, windowSec: MIN };
const GLOBAL_WRITE: RatePolicy = { name: "global-write", limit: 60, windowSec: MIN };

export function policiesFor(method: string, path: string): RatePolicy[] {
  const safe = method === "GET" || method === "HEAD" || method === "OPTIONS";
  const out: RatePolicy[] = [safe ? GLOBAL_READ : GLOBAL_WRITE];
  const specific = rules.find((r) => r.method === method && r.pattern.test(path));
  if (specific) out.push(specific.policy);
  return out;
}

/** An address that is rate-limited this many times in 10 minutes gets blocked outright. */
export const VIOLATIONS_BEFORE_BLOCK = 30;
export const VIOLATION_WINDOW_SEC = 10 * MIN;

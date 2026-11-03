/**
 * Browser calls to the RiTECHS API. Requests go to the same origin
 * (/api/*), which Next.js rewrites to the NestJS server, so the session
 * cookie stays first-party, httpOnly and SameSite=Lax.
 */
export interface ApiError {
  ok: false;
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}
export type ApiResult<T> = ({ ok: true } & T) | ApiError;

const NETWORK: ApiError = { ok: false, status: 0, code: "NETWORK", message: "We couldn't reach the server. Check your connection and try again." };

/** Messages for Better Auth error codes that people can act on. */
const AUTH_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match. Check them and try again.",
  EMAIL_NOT_VERIFIED: "Please confirm your email address first — we've sent you a new link.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  PASSWORD_TOO_SHORT: "Use at least 10 characters.",
  PASSWORD_COMPROMISED: "This password has appeared in a known data breach. Please choose a different one.",
  INVALID_CODE: "That code is not correct. Check your authenticator app and try again.",
  INVALID_TWO_FACTOR_COOKIE: "Your sign-in timed out. Enter your email and password again.",
  BANNED_USER: "This account has been suspended. Contact info@ritechs.org.",
};

/** Like `api`, but returns the parsed body untouched as `data` (arrays included). */
export async function apiRaw<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<({ ok: true; data: T }) | ApiError> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body || init.form ? "POST" : "GET"),
      credentials: "same-origin",
      headers: init.form ? undefined : init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    return NETWORK;
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data: data as T };
  const body = data as { error?: { code?: string; message?: string; fields?: Record<string, string> }; code?: string; message?: string };
  const code = body.error?.code ?? body.code ?? "ERROR";
  // API (NestJS) messages are written for their context; the friendly map is for Better Auth codes.
  const message =
    body.error?.message ??
    AUTH_MESSAGES[code] ??
    (res.status === 429 ? (body.message ?? "Too many attempts. Please wait a few minutes and try again.") : body.message) ??
    "Something went wrong. Please try again.";
  return { ok: false, status: res.status, code, message, ...(body.error?.fields ? { fields: body.error.fields } : {}) };
}

export async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<ApiResult<T>> {
  const res = await apiRaw<T>(path, init);
  return res.ok ? ({ ok: true, ...(res.data as T) } as ApiResult<T>) : res;
}

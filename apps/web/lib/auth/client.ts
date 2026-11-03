/**
 * Authentication against Better Auth (mounted by the API at /api/auth) and
 * member registration (/api/members/register).
 */
import type { CountryCode } from "libphonenumber-js/min";
import { api, type ApiResult } from "@/lib/api/client";
import { clearSession, refreshSession } from "@/lib/auth/session";
import type { MemberRole } from "@/lib/data/registration";

export type SignInResult = ApiResult<{ twoFactorRedirect?: boolean }>;

/** Runs a sign-in step and, when it succeeds, refreshes who is signed in (header, login page). */
async function andRefresh<T extends { ok: boolean }>(p: Promise<T>): Promise<T> {
  const res = await p;
  if (res.ok) await refreshSession();
  return res;
}

export function signIn(input: { email: string; password: string; remember: boolean }): Promise<SignInResult> {
  return andRefresh(api("/auth/sign-in/email", { body: { email: input.email, password: input.password, rememberMe: input.remember } }));
}

export function verifyTwoFactor(code: string, trustDevice: boolean) {
  return andRefresh(api("/auth/two-factor/verify-totp", { body: { code, trustDevice } }));
}

export function verifyBackupCode(code: string) {
  return andRefresh(api("/auth/two-factor/verify-backup-code", { body: { code } }));
}

export function resendVerification(email: string) {
  return api("/auth/send-verification-email", { body: { email, callbackURL: "/login?verified=1" } });
}

export async function signOut() {
  const res = await api("/auth/sign-out", { body: {} });
  clearSession();
  return res;
}

export interface MemberRegistration {
  role: MemberRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: { country: CountryCode; number: string };
  gender: string;
  position: string;
  affiliation: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  bio: string;
  qualification: string;
  password: string;
  photo?: File;
}

/** Multipart, so the optional photo travels with the form. */
export function registerMember(input: MemberRegistration) {
  const f = new FormData();
  f.set("type", input.role);
  for (const k of ["firstName", "lastName", "email", "gender", "position", "affiliation", "country", "bio", "qualification", "password"] as const) f.set(k, input[k]);
  f.set("phoneCountry", input.phone.country);
  f.set("phoneNumber", input.phone.number);
  f.set("privacy", "true");
  if (input.photo) f.set("photo", input.photo);
  return api<{ status: string; message: string }>("/members/register", { form: f });
}

export function requestPasswordReset(email: string) {
  return api("/auth/request-password-reset", { body: { email, redirectTo: `${window.location.origin}/reset-password` } });
}

export function resetPassword(token: string, newPassword: string) {
  return api("/auth/reset-password", { body: { token, newPassword } });
}

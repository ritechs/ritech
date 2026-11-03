"use client";

/**
 * Who is signed in, for the parts of the site that are rendered once for
 * everyone (the header, the login and register pages). Read from the session
 * cookie through /api/auth/get-session once per page load and shared by every
 * component; sign-in and sign-out update it straight away.
 */
import { useSyncExternalStore } from "react";
import { apiRaw } from "@/lib/api/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
}
/** undefined while loading, null when signed out. */
type State = SessionUser | null | undefined;

let state: State = undefined;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (next: State) => {
  state = next;
  for (const l of listeners) l();
};

/** Re-reads the session from the server (after signing in, or when the tab regains focus). */
export function refreshSession() {
  inflight ??= apiRaw<{ user: SessionUser } | null>("/auth/get-session")
    .then((r) => set(r.ok && r.data?.user ? r.data.user : null))
    .catch(() => set(null))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Call after signing out. */
export const clearSession = () => set(null);

function subscribe(l: () => void) {
  listeners.add(l);
  if (state === undefined) void refreshSession();
  const onFocus = () => document.visibilityState === "visible" && void refreshSession();
  document.addEventListener("visibilitychange", onFocus);
  return () => {
    listeners.delete(l);
    document.removeEventListener("visibilitychange", onFocus);
  };
}

/** The signed-in user (undefined while checking, null when signed out). */
export function useSession(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => undefined,
  );
}

export const isStaff = (u: SessionUser | null | undefined) => u?.role === "admin" || u?.role === "editor";

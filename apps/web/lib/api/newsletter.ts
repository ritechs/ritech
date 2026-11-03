import { api } from "@/lib/api/client";

export type SubscribeResult = { ok: true } | { ok: false; message: string };

/** Double opt-in: the API emails a confirmation link; nothing is sent to the list until it is clicked. */
export async function subscribeToNewsletter(email: string, honeypot = ""): Promise<SubscribeResult> {
  const res = await api("/newsletter", { body: { email, ...(honeypot ? { website: honeypot } : {}) } });
  return res.ok ? { ok: true } : { ok: false, message: res.fields?.email ?? res.message };
}

export const confirmNewsletter = (token: string) => api("/newsletter/confirm", { body: { token } });
export const unsubscribeNewsletter = (token: string) => api("/newsletter/unsubscribe", { body: { token } });

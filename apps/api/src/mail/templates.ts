/**
 * Email templates. All dynamic values are escaped; links are built only from
 * WEB_URL plus a token, never from user input.
 */
import { escapeHtml as e } from "../common/sanitize.js";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const layout = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(title)}</title></head>
<body style="margin:0;background:#f7f6f5;font-family:Arial,Helvetica,sans-serif;color:#202124">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e7e3e4;border-radius:8px">
<tr><td style="background:#70243d;padding:20px 28px;border-radius:8px 8px 0 0;color:#ffffff;font-size:20px;font-weight:bold">RiTECHS</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e7e3e4;font-size:12px;color:#6b6b6b">Research, Innovation, Technology &amp; Solution · ritechs.org</td></tr>
</table></td></tr></table></body></html>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${e(href)}" style="background:#70243d;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${e(label)}</a></p>
<p style="font-size:13px;color:#6b6b6b">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${e(href)}</span></p>`;

const p = (t: string) => `<p>${e(t)}</p>`;

function build(subject: string, paragraphs: string[], action?: { href: string; label: string }, after: string[] = []): RenderedEmail {
  const html = layout(subject, `<h1 style="font-size:20px;margin:0 0 16px">${e(subject)}</h1>${paragraphs.map(p).join("")}${action ? button(action.href, action.label) : ""}${after.map(p).join("")}`);
  const text = [subject, "", ...paragraphs, ...(action ? ["", `${action.label}: ${action.href}`] : []), ...(after.length ? ["", ...after] : [])].join("\n");
  return { subject, html, text };
}

type Data = Record<string, unknown>;
const s = (d: Data, k: string) => String(d[k] ?? "");

export const templates: Record<string, (d: Data) => RenderedEmail> = {
  "verify-email": (d) =>
    build("Confirm your email address", [`Hello ${s(d, "name")},`, "Thanks for registering with RiTECHS. Please confirm your email address. The link is valid for 24 hours."], { href: s(d, "url"), label: "Confirm Email" }, ["If you did not create an account, you can ignore this email."]),
  "reset-password": (d) =>
    build("Reset your password", [`Hello ${s(d, "name")},`, "We received a request to reset your RiTECHS password. The link is valid for 30 minutes and can be used once."], { href: s(d, "url"), label: "Reset Password" }, ["If you did not ask for this, ignore this email — your password stays the same."]),
  "existing-account": (d) =>
    build("Someone tried to register with your email", ["Someone tried to create a RiTECHS account with this email address, which already has an account.", "If this was you, sign in instead, or reset your password if you have forgotten it."], { href: s(d, "url"), label: "Reset Password" }, ["If it was not you, no action is needed."]),
  "account-locked": (d) =>
    build("Sign-in temporarily locked", ["We locked sign-in to your RiTECHS account after several incorrect password attempts.", `You can try again after ${s(d, "until")}. If this was not you, reset your password now — it also signs out every device.`], { href: s(d, "url"), label: "Reset Password" }),
  "password-changed": () =>
    build("Your password was changed", ["The password for your RiTECHS account was just changed and all other sessions were signed out.", "If you did not do this, reset your password immediately and contact info@ritechs.org."]),
  "registration-received": (d) =>
    build("Registration received", [`Hello ${s(d, "name")},`, `Thank you for registering as a RiTECHS ${s(d, "type")}. Once you have confirmed your email, our team will review your application and let you know.`]),
  "member-approved": (d) =>
    build("Your membership is approved", [`Hello ${s(d, "name")},`, `Welcome to RiTECHS. Your ${s(d, "type")} membership has been approved.`], { href: s(d, "url"), label: "Sign In" }),
  "member-rejected": (d) =>
    build("About your RiTECHS application", [`Hello ${s(d, "name")},`, "Thank you for your interest in RiTECHS. We are unable to approve your application at this time.", ...(d.note ? [`Note from the team: ${s(d, "note")}`] : [])]),
  "newsletter-confirm": (d) =>
    build("Confirm your subscription", ["Please confirm that you would like to receive RiTECHS news and conference announcements."], { href: s(d, "url"), label: "Confirm Subscription" }, ["If you did not sign up, ignore this email and you will not be subscribed."]),
  "event-registration": (d) =>
    build("Registration received", [`Hello ${s(d, "name")},`, `We have received your registration for ${s(d, "title")}. We will contact you with joining details.`]),
  "member-request": (d) =>
    build(s(d, "subject"), [`Hello ${s(d, "name")},`, `${s(d, "from")} ${s(d, "what")}`, ...(d.message ? [`Their message: “${s(d, "message")}”`] : []), "Open your dashboard to accept or decline."], { href: s(d, "url"), label: "Open Requests" }),
  "member-request-answer": (d) =>
    build(s(d, "subject"), [`Hello ${s(d, "name")},`, `${s(d, "from")} ${s(d, "answer")} your request: ${s(d, "what")}.`, ...(d.reply ? [`Their reply: “${s(d, "reply")}”`] : [])], { href: s(d, "url"), label: "Open Your Dashboard" }),
  "member-message": (d) =>
    build(`New message from ${s(d, "from")}`, [`Hello ${s(d, "name")},`, `${s(d, "from")} sent you a message on RiTECHS: “${s(d, "subject")}”.`], { href: s(d, "url"), label: "Read Message" }),
  "security-alert": (d) => build(`[RiTECHS security] ${s(d, "title")}`, (d.lines as string[]) ?? []),
  campaign: (d) => {
    const subject = s(d, "subject");
    const html = layout(subject, `${s(d, "bodyHtml")}<p style="font-size:12px;color:#6b6b6b;margin-top:32px"><a href="${e(s(d, "unsubscribeUrl"))}" style="color:#6b6b6b">Unsubscribe</a></p>`);
    return { subject, html, text: `${subject}\n\n${s(d, "bodyText")}\n\nUnsubscribe: ${s(d, "unsubscribeUrl")}` };
  },
};

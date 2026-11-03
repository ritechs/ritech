import { Inject, Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { ENV, type Env } from "../config/env.js";
import { JobsService } from "../jobs/jobs.service.js";
import { templates } from "./templates.js";

export interface SentMail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Emails are queued as jobs and sent by the worker, so a slow or failing SMTP
 * server never slows down a request, and failed sends are retried.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger("Mail");
  private readonly transport: Transporter | null;
  /** Test/dev outbox (only used when no SMTP server is configured). */
  static readonly outbox: SentMail[] = [];

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jobs: JobsService,
  ) {
    this.transport = env.SMTP_URL && !env.RESEND_API_KEY ? nodemailer.createTransport(env.SMTP_URL) : null;
    jobs.register("email", async (payload) => {
      await this.deliver(String(payload.to), String(payload.template), (payload.data as Record<string, unknown>) ?? {});
    });
  }

  queue(to: string, template: keyof typeof templates, data: Record<string, unknown> = {}, opts: { dedupeKey?: string } = {}) {
    return this.jobs.enqueue("email", { to, template, data }, opts);
  }

  async deliver(to: string, template: string, data: Record<string, unknown>) {
    const render = templates[template];
    if (!render) throw new Error(`Unknown email template "${template}"`);
    const mail = render(data);
    if (this.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.env.MAIL_FROM, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
        signal: AbortSignal.timeout(15_000),
      });
      // Throwing makes the job queue retry with backoff (a 4xx for a bad address also ends up as a failed job).
      if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return;
    }
    if (!this.transport) {
      MailService.outbox.push({ to, subject: mail.subject, text: mail.text });
      if (MailService.outbox.length > 200) MailService.outbox.shift();
      // Links are printed only outside production, to make local testing possible.
      if (this.env.NODE_ENV === "development") this.log.log(`[dev mail] to=${to} subject="${mail.subject}"\n${mail.text}`);
      return;
    }
    await this.transport.sendMail({ from: this.env.MAIL_FROM, to, subject: mail.subject, html: mail.html, text: mail.text });
  }
}

/**
 * Structured JSON logs (pino). Secrets, cookies and passwords are redacted
 * before they can reach a log line.
 */
import type { LoggerService } from "@nestjs/common";
import pino, { type Logger } from "pino";

export const REDACT = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers['x-internal-token']",
  "res.headers['set-cookie']",
  "*.password",
  "*.newPassword",
  "*.currentPassword",
  "*.token",
  "*.secret",
  "*.backupCodes",
];

export function createRootLogger(level: string, pretty: boolean): Logger {
  return pino({
    level,
    redact: { paths: REDACT, censor: "[redacted]" },
    base: { service: "ritechs-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(pretty ? { transport: { target: "pino-pretty", options: { colorize: true, singleLine: true } } } : {}),
  });
}

/** Routes Nest's own logging through pino. */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly root: Logger) {}
  private emit(level: "info" | "error" | "warn" | "debug" | "trace", message: unknown, rest: unknown[]) {
    const context = typeof rest[rest.length - 1] === "string" ? (rest.pop() as string) : undefined;
    const log = context ? this.root.child({ context }) : this.root;
    if (message && typeof message === "object") log[level](message as object, (rest[0] as string) ?? "");
    else log[level](String(message));
  }
  log(m: unknown, ...r: unknown[]) { this.emit("info", m, r); }
  error(m: unknown, ...r: unknown[]) { this.emit("error", m, r); }
  warn(m: unknown, ...r: unknown[]) { this.emit("warn", m, r); }
  debug(m: unknown, ...r: unknown[]) { this.emit("debug", m, r); }
  verbose(m: unknown, ...r: unknown[]) { this.emit("trace", m, r); }
}

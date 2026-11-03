import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import { currentContext } from "./request-context.js";

/**
 * Consistent error bodies, and no internals in responses: unexpected errors
 * become a generic 500 with the request id, and the details go to the log.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger("Errors");

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = currentContext()?.requestId;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body && "error" in body) return res.status(status).json({ ...body, requestId });
      const message = typeof body === "string" ? body : ((body as { message?: string | string[] }).message ?? exception.message);
      return res.status(status).json({
        error: { code: HttpStatus[status] ?? "ERROR", message: Array.isArray(message) ? message.join(" ") : message },
        requestId,
      });
    }
    // body-parser errors (too large, bad JSON) carry a status.
    const e = exception as { status?: number; type?: string };
    if (e?.status && e.status >= 400 && e.status < 500) {
      const code = e.type === "entity.too.large" ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST";
      return res.status(e.status).json({ error: { code, message: code === "PAYLOAD_TOO_LARGE" ? "The request is too large." : "The request could not be read." }, requestId });
    }
    this.log.error({ err: exception, requestId }, "unhandled error");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, requestId });
  }
}

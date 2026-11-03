import { HttpException, HttpStatus } from "@nestjs/common";

/** Every error response has this shape: { error: { code, message, fields? } }. */
export class AppError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, fields?: Record<string, string>) {
    super({ error: { code, message, ...(fields ? { fields } : {}) } }, status);
  }
}

export const notFound = (what = "Resource") => new AppError(HttpStatus.NOT_FOUND, "NOT_FOUND", `${what} not found.`);
export const forbidden = (message = "You do not have permission to do this.", code = "FORBIDDEN") => new AppError(HttpStatus.FORBIDDEN, code, message);
export const conflict = (message: string, code = "CONFLICT") => new AppError(HttpStatus.CONFLICT, code, message);
export const badRequest = (message: string, code = "BAD_REQUEST", fields?: Record<string, string>) => new AppError(HttpStatus.BAD_REQUEST, code, message, fields);

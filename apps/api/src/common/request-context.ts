/**
 * Per-request context (client IP, user agent, request id, signed-in user),
 * available anywhere in the call chain without passing `req` around.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  /** Request came from our own Next.js server with the internal token. */
  internal: boolean;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const currentContext = (): RequestContext | undefined => requestContext.getStore();

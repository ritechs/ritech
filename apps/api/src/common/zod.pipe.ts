import { HttpStatus, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { AppError } from "./errors.js";

/** Validates and transforms input with a shared zod schema. Unknown keys are dropped. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const r = this.schema.safeParse(value);
    if (r.success) return r.data;
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    throw new AppError(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Some fields need attention.", fields);
  }
}

export const zod = <T extends z.ZodType>(schema: T) => new ZodPipe(schema);

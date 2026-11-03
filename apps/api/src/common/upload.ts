import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";

/**
 * Single-file multipart upload held in memory (never written to a temp dir),
 * with hard limits on size, file count and form fields.
 */
export const SingleUpload = (field: string, maxBytes: number) =>
  FileInterceptor(field, {
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 40, fieldSize: 16 * 1024, parts: 50, headerPairs: 50 },
  });

export interface UploadedFileLike {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

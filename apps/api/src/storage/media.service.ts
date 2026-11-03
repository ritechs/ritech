/**
 * Upload pipeline. The real file type is read from the bytes (not the name
 * or the browser's Content-Type); images are decoded and re-encoded to WebP,
 * which strips metadata (GPS, camera data) and destroys polyglot payloads.
 */
import { Injectable } from "@nestjs/common";
import { schema, type Database } from "@ritechs/db";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { badRequest } from "../common/errors.js";
import { InjectDb } from "../database/database.module.js";
import { StorageService } from "./storage.service.js";

export type MediaPurpose = (typeof schema.mediaPurpose.enumValues)[number];

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_DIM: Record<MediaPurpose, number> = { avatar: 800, logo: 800, cover: 2400, gallery: 2400, content: 2000, document: 0 };
export const UPLOAD_LIMITS = { imageBytes: 5 * 1024 * 1024, avatarBytes: 2 * 1024 * 1024, documentBytes: 10 * 1024 * 1024 };

sharp.cache(false);
sharp.concurrency(2);

@Injectable()
export class MediaService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  async store(file: { buffer: Buffer; originalname?: string; size: number }, purpose: MediaPurpose, uploadedBy: string | null, alt?: string) {
    const type = await fileTypeFromBuffer(file.buffer);
    const now = new Date();
    const prefix = `${purpose}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    if (purpose === "document") {
      if (type?.mime !== "application/pdf") throw badRequest("Upload a PDF document.", "UNSUPPORTED_FILE");
      if (file.size > UPLOAD_LIMITS.documentBytes) throw badRequest("Documents can be at most 10 MB.", "FILE_TOO_LARGE");
      const key = `${prefix}/${randomUUID()}.pdf`;
      await this.storage.put(key, file.buffer, "application/pdf", "attachment");
      return this.insert({ key, purpose, mime: "application/pdf", size: file.size, uploadedBy, originalName: file.originalname, alt });
    }

    if (!type || !IMAGE_TYPES.has(type.mime)) throw badRequest("Upload a JPG, PNG, GIF or WebP image.", "UNSUPPORTED_FILE");
    const max = purpose === "avatar" ? UPLOAD_LIMITS.avatarBytes : UPLOAD_LIMITS.imageBytes;
    if (file.size > max) throw badRequest(`Images can be at most ${max / 1024 / 1024} MB.`, "FILE_TOO_LARGE");

    let out: { data: Buffer; info: OutputInfo };
    try {
      out = await sharp(file.buffer, { limitInputPixels: 40_000_000, pages: 1, failOn: "error" })
        .rotate()
        .resize({ width: MAX_DIM[purpose], height: MAX_DIM[purpose], fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw badRequest("The image could not be read. Try another file.", "UNSUPPORTED_FILE");
    }
    const key = `${prefix}/${randomUUID()}.webp`;
    await this.storage.put(key, out.data, "image/webp");
    return this.insert({ key, purpose, mime: "image/webp", size: out.data.length, width: out.info.width, height: out.info.height, uploadedBy, originalName: file.originalname, alt });
  }

  private async insert(m: { key: string; purpose: MediaPurpose; mime: string; size: number; width?: number; height?: number; uploadedBy: string | null; originalName?: string | undefined; alt?: string | undefined }) {
    const [row] = await this.db
      .insert(schema.media)
      .values({
        storageKey: m.key,
        purpose: m.purpose,
        mimeType: m.mime,
        sizeBytes: m.size,
        width: m.width ?? null,
        height: m.height ?? null,
        originalName: m.originalName?.replace(/[^\w.\- ]+/g, "_").slice(0, 200) ?? null,
        alt: m.alt?.slice(0, 300) ?? null,
        uploadedBy: m.uploadedBy,
      })
      .returning();
    return { ...row!, url: this.storage.publicUrl(m.key) };
  }

  url(key: string) {
    return this.storage.publicUrl(key);
  }
}

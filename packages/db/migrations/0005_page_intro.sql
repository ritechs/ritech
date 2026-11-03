ALTER TABLE "pages" ADD COLUMN "intro" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "legacy_id" integer;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_legacy_id_unique" UNIQUE("legacy_id");
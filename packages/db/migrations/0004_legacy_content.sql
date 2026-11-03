ALTER TABLE "gallery_items" ALTER COLUMN "media_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conference_fees" ADD COLUMN "overseas_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "conference_fees" ADD COLUMN "overseas_currency" char(3);--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "highlights" text;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "camera_ready" text;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "camera_ready_url" text;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "registration_note" text;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "social_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "legacy_cover_path" text;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "legacy_call_for_papers_path" text;--> statement-breakpoint
ALTER TABLE "conferences" ADD COLUMN "legacy_camera_ready_path" text;--> statement-breakpoint
ALTER TABLE "gallery_albums" ADD COLUMN "legacy_id" integer;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD COLUMN "legacy_path" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "projects" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "news_posts" ADD COLUMN "legacy_cover_path" text;--> statement-breakpoint
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_legacy_id_unique" UNIQUE("legacy_id");--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_source_check" CHECK ("gallery_items"."media_id" IS NOT NULL OR "gallery_items"."legacy_path" IS NOT NULL);
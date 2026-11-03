ALTER TABLE "member_profiles" ALTER COLUMN "country" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "schedule_note" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "research_field" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "links" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "membership_label" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "legacy_mentor_id" integer;--> statement-breakpoint
ALTER TABLE "speakers" ADD COLUMN "legacy_photo_path" text;
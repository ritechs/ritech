CREATE TYPE "public"."attendance_mode" AS ENUM('in-person', 'online', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('seminar', 'bootcamp', 'research-adda', 'cyber4me', 'workshop', 'webinar');--> statement-breakpoint
CREATE TYPE "public"."inbox_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lookup_kind" AS ENUM('reference_style', 'required_area');--> statement-breakpoint
CREATE TYPE "public"."media_purpose" AS ENUM('avatar', 'logo', 'cover', 'document', 'gallery', 'content');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."member_type" AS ENUM('mentor', 'mentee');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."quote_service" AS ENUM('editing', 'proofreading', 'formatting', 'poster', 'training', 'other');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('new', 'quoted', 'accepted', 'declined', 'closed');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('pending', 'confirmed', 'waitlisted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."ip_rule_action" AS ENUM('block', 'allow');--> statement-breakpoint
CREATE TYPE "public"."ip_rule_source" AS ENUM('manual', 'auto');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT false,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"two_factor_enabled" boolean DEFAULT false,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"ip" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conference_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"prize" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_committee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conference_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"role" text NOT NULL,
	"members" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conference_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conference_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conference_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"early_amount" numeric(10, 2),
	"regular_amount" numeric(10, 2),
	"online_amount" numeric(10, 2),
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "conference_speakers" (
	"conference_id" uuid NOT NULL,
	"speaker_id" uuid NOT NULL,
	"role" text DEFAULT 'speaker' NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "conference_speakers_conference_id_speaker_id_pk" PRIMARY KEY("conference_id","speaker_id")
);
--> statement-breakpoint
CREATE TABLE "conference_sponsors" (
	"conference_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"tier" text,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "conference_sponsors_conference_id_organisation_id_pk" PRIMARY KEY("conference_id","organisation_id")
);
--> statement-breakpoint
CREATE TABLE "conference_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conference_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scope" text,
	"chairs" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"acronym" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"objective" text,
	"about" text,
	"join_us" text,
	"paper_submission" text,
	"publication" text[] DEFAULT '{}'::text[] NOT NULL,
	"venue" text,
	"location" text,
	"mode" "attendance_mode" DEFAULT 'in-person' NOT NULL,
	"start_date" date,
	"end_date" date,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"external_url" text,
	"submission_url" text,
	"cover_id" uuid,
	"call_for_papers_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"legacy_id" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conferences_slug_unique" UNIQUE("slug"),
	CONSTRAINT "conferences_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "conferences_dates_check" CHECK ("conferences"."end_date" IS NULL OR "conferences"."start_date" IS NULL OR "conferences"."end_date" >= "conferences"."start_date")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "inbox_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"audience" jsonb NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"queued_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_speakers" (
	"event_id" uuid NOT NULL,
	"speaker_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "event_speakers_event_id_speaker_id_pk" PRIMARY KEY("event_id","speaker_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"description" text,
	"venue" text,
	"location" text,
	"mode" "attendance_mode" DEFAULT 'in-person' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"fee" numeric(10, 2),
	"currency" char(3) DEFAULT 'GBP' NOT NULL,
	"capacity" integer,
	"registration_open" boolean DEFAULT false NOT NULL,
	"cover_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"legacy_id" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "events_capacity_check" CHECK ("events"."capacity" IS NULL OR "events"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "expertise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expertise_name_unique" UNIQUE("name"),
	CONSTRAINT "expertise_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"taken_on" date,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_albums_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption" text,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lookup_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "lookup_kind" NOT NULL,
	"name" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"purpose" "media_purpose" NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"original_name" text,
	"alt" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "member_expertise" (
	"user_id" text NOT NULL,
	"expertise_id" uuid NOT NULL,
	CONSTRAINT "member_expertise_user_id_expertise_id_pk" PRIMARY KEY("user_id","expertise_id")
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"type" "member_type" NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"slug" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"gender" text,
	"phone_e164" text,
	"position" text NOT NULL,
	"qualification" text,
	"affiliation" text NOT NULL,
	"country" char(2) NOT NULL,
	"city" text,
	"bio" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"legacy_photo_path" text,
	"featured" boolean DEFAULT false NOT NULL,
	"show_in_directory" boolean DEFAULT true NOT NULL,
	"privacy_accepted_at" timestamp with time zone NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(affiliation,'') || ' ' || coalesce(position,'') || ' ' || coalesce(country,''))) STORED,
	CONSTRAINT "member_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "member_profiles_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "membership_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"from_type" "member_type" NOT NULL,
	"to_type" "member_type" NOT NULL,
	"reason" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"cover_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"author_id" text,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "news_posts_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"token_hash" text,
	"token_expires_at" timestamp with time zone,
	"unsubscribe_hash" text NOT NULL,
	"source" text,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"acronym" text,
	"website" text,
	"logo_id" uuid,
	"legacy_logo_path" text,
	"city" text,
	"country" char(2),
	"is_partner" boolean DEFAULT false NOT NULL,
	"partner_order" smallint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organisations_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"meta_description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"abstract" text NOT NULL,
	"authors" jsonb NOT NULL,
	"area" text NOT NULL,
	"type" text NOT NULL,
	"venue" text NOT NULL,
	"volume" text,
	"doi" text,
	"url" text,
	"pdf_id" uuid,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"published_on" date NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(abstract,'')), 'B') || setweight(to_tsvector('english', coalesce(venue,'')), 'C')) STORED,
	CONSTRAINT "publications_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text,
	"service" "quote_service" NOT NULL,
	"reference_style" text,
	"word_count" integer,
	"details" text NOT NULL,
	"status" "quote_status" DEFAULT 'new' NOT NULL,
	"quoted_amount" numeric(10, 2),
	"currency" char(3) DEFAULT 'GBP',
	"handled_by" text,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_requests_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"conference_id" uuid,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text,
	"organisation" text,
	"attendance" "attendance_mode",
	"notes" text,
	"status" "registration_status" DEFAULT 'pending' NOT NULL,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "registrations_target_check" CHECK (num_nonnulls("registrations"."event_id", "registrations"."conference_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"designation" text,
	"organisation" text,
	"bio" text,
	"website" text,
	"photo_id" uuid,
	"legacy_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speakers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "speakers_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "sponsorship_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conference_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"tier" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"availability" text,
	"benefits" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_throttle" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"lock_count" smallint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cidr" "cidr" NOT NULL,
	"action" "ip_rule_action" NOT NULL,
	"source" "ip_rule_source" DEFAULT 'manual' NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" text,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"queue" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"max_attempts" smallint DEFAULT 5 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_awards" ADD CONSTRAINT "conference_awards_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_committee" ADD CONSTRAINT "conference_committee_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_dates" ADD CONSTRAINT "conference_dates_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_fees" ADD CONSTRAINT "conference_fees_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_speakers" ADD CONSTRAINT "conference_speakers_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_speakers" ADD CONSTRAINT "conference_speakers_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_sponsors" ADD CONSTRAINT "conference_sponsors_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_sponsors" ADD CONSTRAINT "conference_sponsors_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_tracks" ADD CONSTRAINT "conference_tracks_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conferences" ADD CONSTRAINT "conferences_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conferences" ADD CONSTRAINT "conferences_call_for_papers_id_media_id_fk" FOREIGN KEY ("call_for_papers_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conferences" ADD CONSTRAINT "conferences_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_speakers" ADD CONSTRAINT "event_speakers_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_album_id_gallery_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_group_members" ADD CONSTRAINT "mail_group_members_group_id_mail_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."mail_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_groups" ADD CONSTRAINT "mail_groups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_expertise" ADD CONSTRAINT "member_expertise_user_id_member_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."member_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_expertise" ADD CONSTRAINT "member_expertise_expertise_id_expertise_id_fk" FOREIGN KEY ("expertise_id") REFERENCES "public"."expertise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_change_requests" ADD CONSTRAINT "membership_change_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_change_requests" ADD CONSTRAINT "membership_change_requests_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_pdf_id_media_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_packages" ADD CONSTRAINT "sponsorship_packages_conference_id_conferences_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "conference_committee_conf_idx" ON "conference_committee" USING btree ("conference_id","position");--> statement-breakpoint
CREATE INDEX "conference_dates_conf_idx" ON "conference_dates" USING btree ("conference_id","position");--> statement-breakpoint
CREATE INDEX "conference_fees_conf_idx" ON "conference_fees" USING btree ("conference_id","position");--> statement-breakpoint
CREATE INDEX "conference_tracks_conf_idx" ON "conference_tracks" USING btree ("conference_id","position");--> statement-breakpoint
CREATE INDEX "conferences_status_start_idx" ON "conferences" USING btree ("status","start_date");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "events_status_start_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "gallery_items_album_idx" ON "gallery_items" USING btree ("album_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "lookup_options_kind_name_idx" ON "lookup_options" USING btree ("kind","name");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_group_members_unique_idx" ON "mail_group_members" USING btree ("group_id","email");--> statement-breakpoint
CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "member_expertise_expertise_idx" ON "member_expertise" USING btree ("expertise_id");--> statement-breakpoint
CREATE INDEX "member_profiles_type_status_idx" ON "member_profiles" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "member_profiles_directory_idx" ON "member_profiles" USING btree ("type","status","show_in_directory","featured");--> statement-breakpoint
CREATE INDEX "member_profiles_search_idx" ON "member_profiles" USING gin ("search");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_change_one_pending_idx" ON "membership_change_requests" USING btree ("user_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "membership_change_status_idx" ON "membership_change_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "news_posts_status_published_idx" ON "news_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "newsletter_status_idx" ON "newsletter_subscribers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_token_idx" ON "newsletter_subscribers" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_unsubscribe_idx" ON "newsletter_subscribers" USING btree ("unsubscribe_hash");--> statement-breakpoint
CREATE INDEX "organisations_partner_idx" ON "organisations" USING btree ("is_partner","active","partner_order");--> statement-breakpoint
CREATE INDEX "publications_status_date_idx" ON "publications" USING btree ("status","published_on");--> statement-breakpoint
CREATE INDEX "publications_area_idx" ON "publications" USING btree ("area");--> statement-breakpoint
CREATE INDEX "publications_search_idx" ON "publications" USING gin ("search");--> statement-breakpoint
CREATE INDEX "quote_requests_status_idx" ON "quote_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_event_email_idx" ON "registrations" USING btree ("event_id","email") WHERE event_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_conference_email_idx" ON "registrations" USING btree ("conference_id","email") WHERE conference_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "registrations_user_idx" ON "registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registrations_created_idx" ON "registrations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_throttle_updated_idx" ON "auth_throttle" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ip_rules_cidr_action_idx" ON "ip_rules" USING btree ("cidr","action");--> statement-breakpoint
CREATE INDEX "ip_rules_expires_idx" ON "ip_rules" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","run_at") WHERE status = 'queued';--> statement-breakpoint
CREATE INDEX "jobs_running_idx" ON "jobs" USING btree ("locked_at") WHERE status = 'running';--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_idx" ON "jobs" USING btree ("dedupe_key") WHERE dedupe_key IS NOT NULL AND status IN ('queued','running');--> statement-breakpoint
CREATE INDEX "rate_limits_reset_idx" ON "rate_limits" USING btree ("reset_at");
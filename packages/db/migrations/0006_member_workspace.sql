CREATE TABLE "funding_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"deadline" date,
	"link" text,
	"expertise_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"course_id" uuid,
	"funding_id" uuid,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reply" text,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_requests_kind_chk" CHECK (kind IN ('mentorship', 'course', 'funding')),
	CONSTRAINT "member_requests_status_chk" CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "member_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"media_id" uuid,
	"url" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration" smallint,
	"duration_unit" text DEFAULT 'week' NOT NULL,
	"fee" numeric(10, 2),
	"currency" char(3) DEFAULT 'GBP' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "citations" integer;--> statement-breakpoint
ALTER TABLE "funding_calls" ADD CONSTRAINT "funding_calls_user_id_member_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."member_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_messages" ADD CONSTRAINT "member_messages_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_requests" ADD CONSTRAINT "member_requests_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_requests" ADD CONSTRAINT "member_requests_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_requests" ADD CONSTRAINT "member_requests_course_id_mentor_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."mentor_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_requests" ADD CONSTRAINT "member_requests_funding_id_funding_calls_id_fk" FOREIGN KEY ("funding_id") REFERENCES "public"."funding_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_resources" ADD CONSTRAINT "member_resources_user_id_member_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."member_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_resources" ADD CONSTRAINT "member_resources_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_courses" ADD CONSTRAINT "mentor_courses_user_id_member_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."member_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funding_calls_open_idx" ON "funding_calls" USING btree ("open","deadline");--> statement-breakpoint
CREATE INDEX "funding_calls_user_idx" ON "funding_calls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_messages_to_idx" ON "member_messages" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "member_messages_from_idx" ON "member_messages" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE INDEX "member_requests_to_idx" ON "member_requests" USING btree ("to_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "member_requests_from_idx" ON "member_requests" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "member_requests_one_open_idx" ON "member_requests" USING btree ("kind","from_user_id","to_user_id",coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid),coalesce(funding_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE status IN ('pending', 'accepted');--> statement-breakpoint
CREATE INDEX "member_resources_user_idx" ON "member_resources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mentor_courses_user_idx" ON "mentor_courses" USING btree ("user_id");
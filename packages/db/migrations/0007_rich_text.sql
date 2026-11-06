-- Multi-line fields edited in the dashboards are now rich text (sanitised HTML from the editor).
-- Convert the existing plain-text values once: escape them and wrap paragraphs, keeping line breaks.
-- Values that already look like HTML (written by the new editor) are left alone, so this is safe to re-run.
CREATE FUNCTION pg_temp.ritechs_text_to_html(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN t
    WHEN t ~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]' THEN t
    ELSE regexp_replace(
      '<p>' || regexp_replace(
        regexp_replace(
          replace(replace(replace(btrim(regexp_replace(t, E'\r\n?', E'\n', 'g')), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
          E'\n[ \t]*\n[ \t\n]*', '</p><p>', 'g'),
        E'\n', '<br>', 'g') || '</p>',
      '<p>\s*</p>', '', 'g')
  END
$$;
--> statement-breakpoint
UPDATE "member_profiles" SET "bio" = pg_temp.ritechs_text_to_html("bio") WHERE "bio" IS NOT NULL AND btrim("bio") <> '' AND "bio" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "member_profiles" SET "review_note" = pg_temp.ritechs_text_to_html("review_note") WHERE "review_note" IS NOT NULL AND btrim("review_note") <> '' AND "review_note" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "membership_change_requests" SET "reason" = pg_temp.ritechs_text_to_html("reason") WHERE "reason" IS NOT NULL AND btrim("reason") <> '' AND "reason" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "membership_change_requests" SET "review_note" = pg_temp.ritechs_text_to_html("review_note") WHERE "review_note" IS NOT NULL AND btrim("review_note") <> '' AND "review_note" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "speakers" SET "bio" = pg_temp.ritechs_text_to_html("bio") WHERE "bio" IS NOT NULL AND btrim("bio") <> '' AND "bio" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "conferences" SET "summary" = pg_temp.ritechs_text_to_html("summary") WHERE "summary" IS NOT NULL AND btrim("summary") <> '' AND "summary" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "conferences" SET "objective" = pg_temp.ritechs_text_to_html("objective") WHERE "objective" IS NOT NULL AND btrim("objective") <> '' AND "objective" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "conferences" SET "registration_note" = pg_temp.ritechs_text_to_html("registration_note") WHERE "registration_note" IS NOT NULL AND btrim("registration_note") <> '' AND "registration_note" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "events" SET "summary" = pg_temp.ritechs_text_to_html("summary") WHERE "summary" IS NOT NULL AND btrim("summary") <> '' AND "summary" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "publications" SET "abstract" = pg_temp.ritechs_text_to_html("abstract") WHERE "abstract" IS NOT NULL AND btrim("abstract") <> '' AND "abstract" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "news_posts" SET "excerpt" = pg_temp.ritechs_text_to_html("excerpt") WHERE "excerpt" IS NOT NULL AND btrim("excerpt") <> '' AND "excerpt" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "pages" SET "intro" = pg_temp.ritechs_text_to_html("intro") WHERE "intro" IS NOT NULL AND btrim("intro") <> '' AND "intro" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "gallery_albums" SET "description" = pg_temp.ritechs_text_to_html("description") WHERE "description" IS NOT NULL AND btrim("description") <> '' AND "description" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "contact_messages" SET "message" = pg_temp.ritechs_text_to_html("message") WHERE "message" IS NOT NULL AND btrim("message") <> '' AND "message" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "mail_groups" SET "description" = pg_temp.ritechs_text_to_html("description") WHERE "description" IS NOT NULL AND btrim("description") <> '' AND "description" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "mentor_courses" SET "description" = pg_temp.ritechs_text_to_html("description") WHERE "description" IS NOT NULL AND btrim("description") <> '' AND "description" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "funding_calls" SET "description" = pg_temp.ritechs_text_to_html("description") WHERE "description" IS NOT NULL AND btrim("description") <> '' AND "description" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "member_requests" SET "message" = pg_temp.ritechs_text_to_html("message") WHERE "message" IS NOT NULL AND btrim("message") <> '' AND "message" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "member_requests" SET "reply" = pg_temp.ritechs_text_to_html("reply") WHERE "reply" IS NOT NULL AND btrim("reply") <> '' AND "reply" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';
--> statement-breakpoint
UPDATE "member_messages" SET "body" = pg_temp.ritechs_text_to_html("body") WHERE "body" IS NOT NULL AND btrim("body") <> '' AND "body" !~* '^\s*<(p|h[1-6]|ul|ol|blockquote|figure|div|pre|table|hr|img)[\s>/]';

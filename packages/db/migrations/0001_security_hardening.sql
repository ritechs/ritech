-- Rate-limit counters are disposable: skip the write-ahead log for speed.
ALTER TABLE rate_limits SET UNLOGGED;
--> statement-breakpoint

-- Audit entries can be added but never changed. Deleting is allowed only for
-- rows past the retention period, and only when the purge job opts in for its
-- own transaction (SET LOCAL ritechs.audit_purge = 'on').
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('ritechs.audit_purge', true) = 'on'
     AND OLD.created_at < now() - interval '400 days' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_logs_block_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_block_truncate();
--> statement-breakpoint

-- Case-insensitive uniqueness for emails that people type in.
CREATE UNIQUE INDEX IF NOT EXISTS user_email_lower_idx ON "user" (lower(email));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS registrations_email_lower_idx ON registrations (lower(email));

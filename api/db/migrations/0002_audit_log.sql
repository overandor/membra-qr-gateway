-- Migration 0002: audit_log table

CREATE TABLE IF NOT EXISTS audit_log (
    id            TEXT PRIMARY KEY,
    event_id      TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    actor         TEXT NOT NULL DEFAULT 'system',
    resource_type TEXT NOT NULL DEFAULT '',
    resource_id   TEXT NOT NULL DEFAULT '',
    details_json  TEXT NOT NULL DEFAULT '{}',
    severity      TEXT NOT NULL DEFAULT 'info',
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_type  ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);

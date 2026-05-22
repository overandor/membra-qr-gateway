-- Migration 0003: receipts table (scan proof records)

CREATE TABLE IF NOT EXISTS receipts (
    id              TEXT PRIMARY KEY,
    artifact_id     TEXT NOT NULL,
    scan_ip_hash    TEXT NOT NULL DEFAULT '',
    user_agent_hash TEXT NOT NULL DEFAULT '',
    proof_hash      TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    verified        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_receipts_artifact ON receipts(artifact_id);

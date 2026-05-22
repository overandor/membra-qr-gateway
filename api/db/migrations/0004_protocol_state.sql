-- Migration 0004: protocol_snapshots table (Solana on-chain program state)

CREATE TABLE IF NOT EXISTS protocol_snapshots (
    id         TEXT PRIMARY KEY,
    program    TEXT NOT NULL,
    state_json TEXT NOT NULL DEFAULT '{}',
    slot       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proto_snap_program ON protocol_snapshots(program);

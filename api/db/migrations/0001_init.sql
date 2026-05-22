-- Migration 0001: initial schema
-- artifacts, gateway_events, events, and tokenomics tables

CREATE TABLE IF NOT EXISTS artifacts (
    artifact_id      TEXT PRIMARY KEY,
    owner_email      TEXT NOT NULL DEFAULT '',
    artifact_title   TEXT NOT NULL,
    artifact_type    TEXT NOT NULL DEFAULT 'proofbook',
    destination_url  TEXT NOT NULL,
    public_wallet    TEXT NOT NULL DEFAULT '',
    provenance_notes TEXT NOT NULL DEFAULT '',
    consent_scope    TEXT NOT NULL DEFAULT '',
    artifact_hash    TEXT NOT NULL,
    qr_url           TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'registered_pending_external_verification',
    stripe_session_id TEXT,
    created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gateway_events (
    event_id     TEXT PRIMARY KEY,
    artifact_id  TEXT,
    event_type   TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    event_id      TEXT PRIMARY KEY,
    event_type    TEXT NOT NULL,
    source_module TEXT NOT NULL DEFAULT '',
    subject_type  TEXT NOT NULL DEFAULT '',
    subject_id    TEXT NOT NULL DEFAULT '',
    owner_id      TEXT,
    risk_level    TEXT NOT NULL DEFAULT 'normal',
    proof_hash    TEXT,
    signature     TEXT,
    payload_json  TEXT NOT NULL DEFAULT '{}',
    status        TEXT NOT NULL DEFAULT 'ingested',
    created_at    TEXT NOT NULL,
    ingested_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type    ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_subject ON events(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS token_sales (
    sale_id             TEXT PRIMARY KEY,
    artifact_id         TEXT NOT NULL DEFAULT '',
    name                TEXT NOT NULL,
    symbol              TEXT NOT NULL,
    max_supply          REAL NOT NULL DEFAULT 10000000,
    initial_price       REAL NOT NULL DEFAULT 0.10,
    max_bonus_pct       REAL NOT NULL DEFAULT 0.50,
    decay_lambda        REAL NOT NULL DEFAULT 3.0,
    total_raised        REAL NOT NULL DEFAULT 0,
    total_sold          REAL NOT NULL DEFAULT 0,
    reward_pool_balance REAL NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'active',
    created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contributions (
    contribution_id   TEXT PRIMARY KEY,
    sale_id           TEXT NOT NULL,
    buyer_wallet      TEXT NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'USDC',
    amount_native     REAL NOT NULL DEFAULT 0,
    amount_usd        REAL NOT NULL DEFAULT 0,
    base_tokens       REAL NOT NULL DEFAULT 0,
    bonus_tokens      REAL NOT NULL DEFAULT 0,
    total_tokens      REAL NOT NULL DEFAULT 0,
    bonus_pct         REAL NOT NULL DEFAULT 0,
    split_treasury    REAL NOT NULL DEFAULT 0,
    split_protocol    REAL NOT NULL DEFAULT 0,
    split_validator   REAL NOT NULL DEFAULT 0,
    split_reward_pool REAL NOT NULL DEFAULT 0,
    position          INTEGER NOT NULL DEFAULT 0,
    receipt_hash      TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rebate_claims (
    claim_id        TEXT PRIMARY KEY,
    contribution_id TEXT NOT NULL,
    sale_id         TEXT NOT NULL,
    buyer_wallet    TEXT NOT NULL,
    claim_amount    REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holder_balances (
    wallet     TEXT NOT NULL,
    sale_id    TEXT NOT NULL,
    balance    REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (wallet, sale_id)
);

CREATE TABLE IF NOT EXISTS rebase_epochs (
    epoch_id            TEXT PRIMARY KEY,
    sale_id             TEXT NOT NULL,
    epoch_number        INTEGER NOT NULL,
    market_price        REAL NOT NULL,
    denomination        REAL NOT NULL,
    rebase_factor       REAL NOT NULL,
    holder_count        INTEGER NOT NULL DEFAULT 0,
    selected_count      INTEGER NOT NULL DEFAULT 0,
    holder_multiplier   REAL NOT NULL DEFAULT 1,
    bonus_issued        REAL NOT NULL DEFAULT 0,
    total_supply_before REAL NOT NULL DEFAULT 0,
    total_supply_after  REAL NOT NULL DEFAULT 0,
    triggered_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holder_rebase_events (
    event_id       TEXT PRIMARY KEY,
    epoch_id       TEXT NOT NULL,
    sale_id        TEXT NOT NULL,
    wallet         TEXT NOT NULL,
    balance_before REAL NOT NULL DEFAULT 0,
    bonus_tokens   REAL NOT NULL DEFAULT 0,
    balance_after  REAL NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rebase_sale ON rebase_epochs(sale_id);
CREATE INDEX IF NOT EXISTS idx_hre_epoch   ON holder_rebase_events(epoch_id);
CREATE INDEX IF NOT EXISTS idx_hre_wallet  ON holder_rebase_events(wallet, sale_id);

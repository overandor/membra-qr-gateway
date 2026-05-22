# Changelog

All notable changes to MEMBRA QR Gateway are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Redis-backed rate limiting for multi-worker deployments
- OpenTelemetry trace export to Jaeger/Tempo
- Pyth oracle CPI integration for permissionless price updates
- Webhook retry queue with exponential back-off
- Admin UI for key rotation and stats

---

## [1.1.0] - 2026-05-22

### Added

**membra_attestation — five-dimensional Proof-of-Build validator network**
- New Anchor program `membra_attestation` implementing a stake-weighted
  compute-validator network for on-chain project risk scoring.
- `initialize`: Create protocol config PDA with configurable `min_stake`,
  `slash_bps`, `min_attestations`, and `reward_per_job`.
- `register_validator` / `stake_validator`: Validator onboarding and staking
  vault creation; staked tokens are at risk of slashing on upheld challenges.
- `register_project` / `submit_attestation`: Builder project registration and
  per-validator SHA-256 report hash + five-dimensional score submission
  (`tech_score`, `treasury_score`, `tokenomics_score`, `gov_score`,
  `transparency_score`).
- `challenge_attestation` / `resolve_challenge`: Any party may challenge;
  protocol authority resolves; upheld challenges slash validator stake and
  decrement reputation.
- `reward_validator`: Protocol vault pays honest validators per completed job.
- `publish_project_score`: Computes stake-weighted averages once
  `min_attestations` non-challenged attestations exist; transitions project to
  `Scored` state and emits `ProjectScorePublished`.
- Full test suite for all eight instructions including edge cases (insufficient
  stake, double-challenge, double-approval).
- TypeScript SDK bindings for `membra_attestation` generated via Anchor IDL.

**API restructure**
- Split monolithic `app.py` routes into dedicated router modules under
  `api/routes/`: `admin`, `audit`, `health`, `metrics`, `protocol`, `qr`,
  `receipts`, `wallet`.
- Added `api/security/input_validation.py` with Pydantic-annotated types:
  `SolanaAddress`, `EmailAddress`, `HttpUrl`, `ShortText`, `LongText`.
- Added `api/security/request_signing.py` — HMAC-SHA256 outbound webhook
  signing with `X-MEMBRA-Signature` header.
- Added `GET /api/protocol/attestation/{project_id}` endpoint returning the
  latest published `ProjectRecord` for a given project PDA.
- Added `GET /api/audit` with filtering by `from`, `to`, `type`, and `actor`
  query parameters; results are paginated (default page size 50).
- Added `POST /api/metrics/event` for telemetry event ingestion from the
  frontend; events are validated and written to the `events` table.
- Added `POST /api/admin/rotate-key` for ADMIN_API_KEY rotation (admin-only).
- Added `GET /api/admin/stats` for aggregate database statistics (admin-only).
- Structured logging via `structlog` with JSON output in production.
- Prometheus metrics endpoint at `/metrics` (counter and histogram families
  for requests, DB query time, chain sync lag).

**CI/CD fixes**
- Fixed anchor-cli installation: now compiles with Rust 1.76.0 and `--locked`
  flag to guarantee reproducible builds regardless of crates.io cache state.
- Added `cache-hit` guard so Anchor CLI is only rebuilt when the cache key
  changes; reduces CI wall time by approximately 12 minutes per run.
- Added `cargo audit` job to protocol CI with RUSTSEC-2024-0344 and
  RUSTSEC-2022-0093 suppressed (transitive Solana SDK constraints, documented).
- Added `clippy --deny warnings` with `-A unexpected_cfgs` to suppress false
  positives from Anchor 0.29 macro expansions.
- Added `.github/workflows/security-scan.yml` running `pip-audit`, `npm audit`,
  and `cargo audit` on a daily schedule.

**Security hardening**
- Added `api/security/encryption.py` — AES-GCM field-level encryption for
  `owner_email` and other PII fields using a 32-byte `FIELD_ENCRYPTION_KEY`.
- Added `api/security/rate_limit.py` — token-bucket rate limiter (100 req/min
  default, 20 req/min for auth routes) applied as FastAPI dependencies.
- Non-root container user (`membra`, UID 1001) in the production Dockerfile.
- Security-headers Nginx snippet (`X-Frame-Options`, `X-Content-Type-Options`,
  `Strict-Transport-Security`, `Content-Security-Policy`).

**Frontend**
- Added `src/services/telemetryService.js` for batched event reporting.
- Added `src/services/auditService.js` for fetching and displaying the audit
  log from the API.
- Added wallet challenge-response flow (`src/services/walletService.js`):
  request nonce → sign with Solana wallet → submit signature for JWT.
- `EarlyRiskCurveFlow` tokenomics visualisation component.

### Changed
- `DB_PATH` default changed from `/tmp/membra_qr_gateway.sqlite3` to
  `/app/data/membra.sqlite3` to match the Docker volume mount.
- `APP_VERSION` bumped to `2.0.0` (internal API contract versioning).
- `protocol/Anchor.toml` updated with `membra_attestation` program entry.
- Production Docker compose now runs 4 uvicorn workers (up from 2).
- Nginx rate-limit snippet updated to align with API-level limits.

### Fixed
- CI: Anchor CLI installation race condition when parallel jobs shared the
  same cache key prefix — now uses a versioned key suffix (`-v4`).
- API: `artifact_hash` was not being validated as a hex string before
  insertion; added `ShortText` + hex-character regex validator.
- API: `GET /qr/{id}` returned a 500 instead of 404 when `artifact_id` did
  not exist; now raises `NotFoundError` correctly.
- API: Readiness probe (`GET /ready`) was not catching `aiosqlite` connection
  errors; exception is now caught and surfaced in `warnings` list.
- Frontend: Wallet address was logged to browser console in development mode;
  removed `console.log` call from `walletService.js`.
- Protocol: `membra_rewards` — `unstake` instruction allowed partial unstake
  to leave `staked_amount` at zero without closing the account; guard added.
- Protocol: `membra_governance` — proposal `execution_window` expiry was
  checked against `approved_ts` instead of `approved_ts + timelock_seconds`;
  correct comparison now enforced.

### Security
- Dependency: `cryptography` pinned to 43.0.0 (was unpinned); earlier versions
  have known CVEs in the OpenSSL binding layer.
- Dependency: `python-jose[cryptography]` 3.3.0 — JWT algorithm confusion
  attack mitigated by explicitly passing `algorithms=["HS256"]` to `jwt.decode`.
- Anchor: `cargo audit` added to CI; two known-suppressed advisories documented
  in workflow comments with justification.

---

## [1.0.0] - 2026-05-17

### Added

**Core platform**
- Initial release of MEMBRA QR Gateway.
- FastAPI backend (`api/`) with SQLite persistence via `aiosqlite`.
- React 18 frontend (`src/`) built with Vite 5, Tailwind CSS, and Lucide icons.
- Multi-stage Docker build: Node 20 Alpine (frontend) + Python 3.11 slim (API).
- `docker-compose.yml` for local development with hot-reload.
- `docker-compose.prod.yml` for production with Nginx reverse proxy, TLS
  via Let's Encrypt, and resource limits.
- `Makefile` with targets: `dev`, `build`, `test`, `lint`, `docker-up`,
  `docker-down`, `migrate`, `audit`, `backup`, `restore`, `rotate-keys`.

**Database schema (SQLite)**
- `artifacts` — QR artifact registry: `artifact_id`, `owner_email`,
  `artifact_title`, `artifact_type`, `destination_url`, `public_wallet`,
  `provenance_notes`, `consent_scope`, `artifact_hash`, `qr_url`, `status`.
- `gateway_events` — raw inbound event log.
- `events` — canonical MEMBRA event store with `risk_level`, `proof_hash`,
  `signature`, and processing `status`.
- `audit_log` — immutable audit trail with `actor`, `resource_type`,
  `resource_id`, `severity`.
- `receipts` — QR scan receipts with IP hash, user-agent hash, proof hash.
- `protocol_snapshots` — cached on-chain state per program.
- `token_sales`, `contributions`, `rebate_claims`, `holder_balances`,
  `rebase_epochs`, `holder_rebase_events` — tokenomics tables.

**Anchor smart contract programs (four programs)**
- `membra_ido` — Initial DEX Offering: `initialize_ido`, `buy_ido`,
  `finalize_ido`, `claim_ido_tokens`, `refund_ido`, `pause_ido`, `cancel_ido`.
- `membra_rebase` — Elastic supply with Pyth / Switchboard / manual oracle
  support: `initialize_rebase`, `update_pyth_price`,
  `update_switchboard_price`, `update_oracle_price`, `execute_rebase`,
  `pause_rebase`, `resume_rebase`, `update_rebase_params`.
- `membra_rewards` — Staking and lock incentives with tier multipliers
  (1×–2×): `initialize_rewards`, `create_lock`, `stake`, `unstake`,
  `claim_rewards`, `close_lock`, `close_stake_account`.
- `membra_governance` — Multisig + timelock authorization layer:
  `initialize_governance`, `propose_action`, `approve_action`,
  `execute_approved_action`, `cancel_action`.

**Security foundations**
- `api/security/api_keys.py` — HMAC-SHA256 API key hashing; constant-time
  comparison via `hmac.compare_digest`.
- `api/security/jwt.py` — HS256 JWT issue and verify via `python-jose`.
- `api/security/secrets.py` — `require_*` helpers that raise on absent secrets.
- `SECURITY.md` — initial security policy.
- `.env.example` and `.env.production.example` with generation instructions.

**CI/CD**
- `.github/workflows/ci.yml` — frontend (Vitest, ESLint) and API (pytest,
  ruff, black) jobs.
- `.github/workflows/protocol-ci.yml` — Anchor build, TypeScript type-check,
  integration tests, `cargo audit`, and Clippy.

**Documentation**
- `README.md` — project overview, quick-start, and architecture summary.
- `MEMBRA_PROTOCOL.md` — protocol specification.
- `MEMBRA_MODULE.md` — module reference.
- `protocol/README.md` — Anchor program build and test instructions.

### Notes
- SQLite is used for persistence in v1.0.0. Migration to PostgreSQL is planned
  for a future release when horizontal scaling is required.
- Rate limiting in v1.0.0 is in-process only; not effective across multiple
  uvicorn workers. Redis-backed limiting is planned for v1.2.0.

---

[Unreleased]: https://github.com/membra/membra-qr-gateway/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/membra/membra-qr-gateway/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/membra/membra-qr-gateway/releases/tag/v1.0.0

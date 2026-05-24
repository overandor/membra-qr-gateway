# MEMBRA QR Gateway — System Architecture

## Overview

MEMBRA QR Gateway is a production-grade Web3 platform that combines a
QR-based artifact registry, on-chain Solana proof settlement, a FastAPI
backend, and a React frontend. Its core purpose is to turn human creative
work (ideas, builds, proofs of work) into verifiable on-chain receipts,
then optionally route those receipts toward market settlement.

---

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser / Mobile                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  React Frontend (Vite + Tailwind)           │   │
│  │                                                             │   │
│  │  Overview  │  Artifacts  │  Wallet  │  Protocol  │  Admin   │   │
│  │                                                             │   │
│  │  ┌──────────────────┐   ┌──────────────────────────────┐   │   │
│  │  │  QR Scan / NFC   │   │  Solana Wallet Adapter        │   │   │
│  │  │  (QR code opens  │   │  (Phantom, Backpack, etc.)    │   │   │
│  │  │   web page)      │   │                              │   │   │
│  │  └────────┬─────────┘   └─────────────┬────────────────┘   │   │
│  └───────────┼─────────────────────────── ┼────────────────────┘   │
│              │  HTTPS + JSON              │  Ed25519 signature     │
└──────────────┼─────────────────────────── ┼────────────────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Nginx (TLS termination + rate limiting)            │
│                  Port 443 → upstream port 7860                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FastAPI Backend  (uvicorn, 4 workers)                  │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │  /health │ │  /api/qr │ │/api/recv │ │/api/wall │ │/api/prot│  │
│  │  /ready  │ │  /api/qr │ │   eipts  │ │   et     │ │  ocol   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │/api/audit│ │/api/admin│ │/api/metr │ │/metrics  │              │
│  │          │ │          │ │   ics    │ │(Prometheus│              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Security Layer                             │   │
│  │  API key (HMAC-SHA256)  │  JWT (HS256)  │  Rate limiter    │   │
│  │  AES-GCM field encrypt  │  HMAC webhook │  Input validation│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐    │
│  │    SQLite (aiosqlite)    │  │   Stripe SDK  (payments)     │    │
│  │    /app/data/membra.db   │  │   stripe==10.7.0             │    │
│  └──────────────────────────┘  └──────────────────────────────┘    │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │  JSON-RPC over HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Solana RPC Node  (mainnet / devnet)                    │
│                                                                     │
│  ┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ membra_ido   │ │membra_rebase│ │membra_rewards│ │ membra_   │  │
│  │              │ │             │ │              │ │ governance│  │
│  └──────────────┘ └─────────────┘ └──────────────┘ └───────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              membra_attestation                              │  │
│  │  (Proof-of-Build validator network)                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. React Frontend (`src/`)

**Technology:** React 18, Vite 5, Tailwind CSS, Lucide icons, Vitest

**Responsibilities:**
- Serve the user-facing QR artifact management dashboard.
- Display the Value State Machine doctrine (12-stage proof-to-settlement flow).
- Connect to Solana wallets (Phantom, Backpack, Solflare) via the Wallet Adapter pattern.
- Execute the wallet challenge-response flow: POST `/api/wallet/challenge` → user signs nonce → POST `/api/wallet/verify` → receive JWT.
- Submit QR artifact registrations and display scan receipts.
- Display protocol state (IDO status, rebase index, rewards pool, governance proposals, attestation scores).
- Render audit log entries filtered by actor, event type, and time range.
- Enforce the consent firewall: hard-blocks sending private keys, seed phrases, raw KYC, or unredacted private data to the API.

**Key services:**
- `apiClient.js` — Axios wrapper with JWT Bearer header injection.
- `walletService.js` — Solana wallet adapter, challenge-response auth.
- `qrService.js` — QR artifact CRUD.
- `receiptService.js` — Scan receipt retrieval.
- `protocolService.js` — On-chain state polling.
- `auditService.js` — Audit log pagination.
- `telemetryService.js` — Batched metric event reporting.
- `authService.js` — Token storage and refresh.

### 2. FastAPI Backend (`api/`)

**Technology:** FastAPI 0.111, uvicorn 0.30, pydantic 2.7, aiosqlite 0.20, structlog 24.2, prometheus-client 0.20

**Responsibilities:**
- Serve as the single HTTP gateway for all client interactions.
- Validate, hash, and persist QR artifact registrations.
- Ingest and verify MEMBRA canonical events (HMAC-SHA256 signature check).
- Record scan receipts; hash IP addresses and user-agents before storage.
- Issue and verify JWTs for wallet-authenticated sessions.
- Proxy read-only queries to the Solana RPC and cache results in `protocol_snapshots`.
- Handle Stripe payment webhooks and update artifact payment status.
- Expose a Prometheus `/metrics` endpoint for the observability stack.
- Write to the immutable `audit_log` table for every state-changing action.

**Router modules** (all under `/api` prefix except health):
| Router     | Prefix              | Auth Required    |
|------------|---------------------|------------------|
| `health`   | `/health`, `/ready` | None             |
| `qr`       | `/api/qr`           | API key or JWT   |
| `receipts` | `/api/receipts`     | API key or JWT   |
| `wallet`   | `/api/wallet`       | Rate limited     |
| `protocol` | `/api/protocol`     | None (read-only) |
| `audit`    | `/api/audit`        | JWT              |
| `admin`    | `/api/admin`        | Admin API key    |
| `metrics`  | `/api/metrics`      | API key          |

### 3. Solana Programs (`protocol/programs/`)

**Technology:** Rust, Anchor 0.29, Solana 1.18.26, SPL Token

Five on-chain programs constitute the MEMBRA Money Protocol:

| Program               | Program ID (devnet placeholder)                  | Role                                     |
|-----------------------|--------------------------------------------------|------------------------------------------|
| `membra_ido`          | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` | Initial token sale (IDO)                 |
| `membra_rebase`       | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS` | Elastic supply rebase via oracle         |
| `membra_rewards`      | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS` | Staking lock incentives                  |
| `membra_governance`   | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS` | Multisig + timelock authorization        |
| `membra_attestation`  | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkk476zPFsLnS` | Stake-weighted Proof-of-Build validator  |

**Design principles:**
- `membra_governance` is a pure authorization layer: it marks proposals `Executed` but does not move funds. Target programs read the proposal PDA on-chain to permit privileged actions.
- `membra_attestation` stores only 32-byte SHA-256 hashes of off-chain reports; Solana stores proof, not the report itself.
- The rebase formula is entirely deterministic on-chain; oracle prices come from Pyth, Switchboard, or a permissioned manual feed.
- All PDAs use deterministic seeds; there are no clock-based nonces that could collide.

### 4. Infrastructure

**Nginx:** Reverse proxy handling TLS termination, security headers, and rate limiting. Static React assets are served directly from the Nginx container's filesystem.

**Docker Compose (production):** Two services — `api` (FastAPI, 4 workers, resource-limited to 1.5 CPU / 512 MB RAM) and `nginx` (rate limiting, TLS, static files). An internal Docker network isolates the API from direct internet access.

**Monitoring stack** (optional, `infra/monitoring/`): Prometheus, Grafana, Loki, Alertmanager. Deployed via a separate Docker Compose file.

---

## Data Flow: QR Scan to On-Chain Proof

```
1. Creator registers artifact
   POST /api/qr
   {artifact_title, destination_url, artifact_type, owner_email,
    public_wallet, provenance_notes, consent_scope}
      │
      ▼
2. API validates input (Pydantic), generates SHA-256 artifact_hash,
   generates artifact_id (UUID), inserts into `artifacts` table,
   writes audit_log entry {event_type: "artifact_registered", actor: <api_key_id>}
      │
      ▼
3. API returns {artifact_id, qr_url, artifact_hash}
   Frontend displays QR code pointing to qr_url
      │
      ▼
4. Supporter scans QR code
   Browser opens destination_url (public web page)
      │
      ▼
5. Supporter connects Solana wallet
   POST /api/wallet/challenge → {nonce}
   Supporter signs nonce with Phantom/Backpack
   POST /api/wallet/verify {wallet_address, signature, nonce} → {token}
      │
      ▼
6. Supporter initiates on-chain support payment
   Frontend constructs Solana transaction referencing artifact PDA
   Wallet presents transaction for user signature (local signing — no key exposure)
   Transaction submitted to Solana RPC
      │
      ▼
7. Transaction confirmed on-chain
   membra_attestation (or support program) emits SupportRecorded event
   Frontend captures tx signature
      │
      ▼
8. Frontend reports scan receipt to API
   POST /api/receipts {artifact_id, tx_signature, proof_hash}
   API stores receipt with hashed IP/user-agent; writes audit_log entry
      │
      ▼
9. API worker (or manual trigger) polls Solana RPC
   GET /api/protocol/attestation/{project_id}
   API calls RPC, decodes ProjectRecord PDA, caches in `protocol_snapshots`
      │
      ▼
10. Audit trail complete
    Creator can query GET /api/audit?actor=<wallet> to see full event chain
    All entries are immutable, append-only in audit_log table
```

---

## Technology Decisions and Rationale

| Decision                     | Choice                        | Rationale                                                                     |
|------------------------------|-------------------------------|-------------------------------------------------------------------------------|
| Backend framework            | FastAPI + uvicorn             | Async-native, Pydantic validation, OpenAPI docs auto-generated, fast startup  |
| Database                     | SQLite via aiosqlite          | Zero-ops for v1; sufficient for single-node; simple backup (cp file); upgrade path to PostgreSQL clear |
| Auth: API keys               | HMAC-SHA256 with salt         | No plaintext storage; constant-time compare; key rotation without DB migration |
| Auth: User sessions          | JWT HS256                     | Stateless; wallet-challenge pattern avoids password storage entirely           |
| Auth: Wallet                 | Ed25519 signature on nonce    | Cryptographically sound; no seed phrase ever transmitted                       |
| Field encryption             | AES-GCM (256-bit)             | AEAD provides both confidentiality and integrity; nonce is random per encrypt  |
| Smart contracts              | Anchor 0.29 on Solana         | Type-safe account deserialization; automatic IDL generation; broad ecosystem   |
| Oracle (rebase)              | Pyth + Switchboard + Manual   | Multi-source resilience; permissionless Pyth path; manual fallback for devnet  |
| Rate limiting                | In-process token bucket       | Sufficient for single-worker; documented limitation for multi-worker           |
| Logging                      | structlog JSON                | Machine-parseable; integrates with Loki; log level controllable at runtime     |
| Metrics                      | Prometheus client             | Industry standard; Grafana-compatible; zero external dependency at runtime     |
| Container base               | python:3.11-slim              | Minimal attack surface; no package manager in production image                 |
| Frontend build               | Vite 5                        | Sub-second HMR in dev; optimized production chunks; tree-shaking               |

---

## Scalability Considerations

### Current limitations (v1.1.0)
- **SQLite:** Single writer; no concurrent write scaling. Acceptable for current load. Migrate to PostgreSQL when write QPS exceeds ~100/s or when horizontal API scaling is needed.
- **Rate limiting:** In-process token bucket is not shared across uvicorn workers. In a 4-worker deployment, effective limit is 4× the configured value. Use Redis-backed limiter for stricter enforcement.
- **Solana RPC:** A single RPC URL is configured. Add a load-balanced pool of RPC endpoints (e.g., Helius, QuickNode) for production throughput.
- **Protocol snapshots:** On-chain state is cached in SQLite. Cache invalidation is periodic (no push notifications). Accept eventual consistency for non-critical display data.

### Horizontal scaling path
1. Move SQLite to PostgreSQL (change `DB_PATH` to `DATABASE_URL`; switch `aiosqlite` to `asyncpg`).
2. Replace in-process rate limiter with Redis token bucket (`redis-py` / `aioredis`).
3. Deploy multiple API containers behind the existing Nginx upstream (update `upstream` block to round-robin pool).
4. Use a shared object store (S3 or equivalent) for artifact files instead of local `/app/storage`.
5. Add a message queue (e.g., Redis Streams) for the Solana RPC polling worker to decouple from request handling.

### Performance targets
- p99 API latency: < 200 ms for read endpoints; < 500 ms for write endpoints.
- Health check response: < 50 ms.
- QR generation: < 100 ms end-to-end.
- Solana RPC query (cached): < 10 ms; (uncached): < 500 ms (RPC timeout configured at 10 s).

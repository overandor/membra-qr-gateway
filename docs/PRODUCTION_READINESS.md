# MEMBRA QR Gateway — Production Readiness Checklist

This document is the authoritative pre-launch checklist. Each item must be
verified by a team member and signed off before deploying to production.
Use the `reports/production_readiness_report.md` for the current assessment.

---

## 1. Security Hardening

### Authentication and Authorization
- [ ] `JWT_SECRET` set to a cryptographically random 256-bit value (`python3 -c "import secrets; print(secrets.token_hex(32))"`)
- [ ] `ADMIN_API_KEY` set and distributed only to operators who need admin access
- [ ] `API_KEY_SALT` set to a random 256-bit value
- [ ] `MEMBRA_EVENT_SECRET` set; HMAC verification enabled for inbound events
- [ ] `FIELD_ENCRYPTION_KEY` set to a 32-byte (64 hex char) value; AES-GCM field encryption active
- [ ] `STRIPE_WEBHOOK_SECRET` set; Stripe signature verification active
- [ ] Admin endpoints tested: confirm unauthenticated requests receive 401/403

### Network Security
- [ ] TLS 1.2+ enforced on all public-facing endpoints (Nginx `ssl_protocols TLSv1.2 TLSv1.3`)
- [ ] HTTP → HTTPS redirect configured (Nginx `return 301 https://$host$request_uri`)
- [ ] `HSTS` header configured (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`)
- [ ] `CORS_ORIGINS` set to explicit allowed origins (not wildcard `*`) in production
- [ ] API container reachable only via Nginx internal network (not exposed on host port)
- [ ] Outbound Solana RPC traffic goes through a dedicated RPC provider (not public mainnet endpoint under load)

### Security Headers (Nginx)
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Content-Security-Policy` configured with explicit `script-src`, `style-src`, `connect-src` directives
- [ ] `Permissions-Policy` configured to restrict camera, microphone, geolocation

### Container Security
- [ ] Production image runs as non-root user (`membra`, UID 1001)
- [ ] No secrets in Dockerfile or image layers (confirmed with `docker history`)
- [ ] Image scanned with Trivy or equivalent: no critical CVEs in base image
- [ ] Container filesystem read-only where possible; only `/app/data` and `/app/storage` are writable

### Dependency Audit
- [ ] `pip-audit` run against `api/requirements.txt` — no known critical vulnerabilities
- [ ] `npm audit` run in project root — no critical vulnerabilities in production dependencies
- [ ] `cargo audit` run in `protocol/` — no unmitigated advisories (RUSTSEC-2024-0344 and RUSTSEC-2022-0093 documented as accepted)
- [ ] All pinned versions in `requirements.txt` and `package-lock.json`

---

## 2. Observability

### Logging
- [ ] `LOG_LEVEL=INFO` in production (not DEBUG — avoid leaking request bodies)
- [ ] structlog JSON output confirmed: each log line is valid JSON with `timestamp`, `level`, `event`, `logger`
- [ ] Log rotation configured: Docker `json-file` driver with `max-size: 50m`, `max-file: 5`
- [ ] Logs shipped to Loki or equivalent (Fluent Bit / Promtail sidecar or log driver)
- [ ] No PII (email addresses, wallet addresses, IP addresses) logged in plaintext — confirm via log review

### Metrics
- [ ] Prometheus `/metrics` endpoint accessible from the monitoring network
- [ ] Key counters registered: `http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`
- [ ] Grafana dashboard imported and displaying data (see `docs/MONITORING.md`)
- [ ] Alertmanager rules deployed for: error rate > 1%, p99 > 500 ms, health check failing

### Health Checks
- [ ] `GET /health` returns 200 within 50 ms
- [ ] `GET /ready` returns 200 with `ok: true` and empty `warnings` array (all secrets configured)
- [ ] Docker `HEALTHCHECK` confirmed working: `docker inspect membra_api_prod | grep -A 5 Health`
- [ ] Nginx upstream health check configured (passive or active)
- [ ] External uptime monitor (e.g., BetterUptime, UptimeRobot) pinging `/health` every 60 s

### Tracing
- [ ] OpenTelemetry instrumentation present (even if exporter is disabled initially)
- [ ] Trace IDs included in error responses for support ticket correlation
- [ ] Trace export configured to Jaeger or Tempo (optional for v1.1, required for v1.2)

---

## 3. Backup and Recovery

- [ ] Automated daily backup of SQLite database configured (see `docs/BACKUP_RECOVERY.md`)
- [ ] Backup files stored off-host (S3, GCS, or equivalent) — not just on the same server
- [ ] Backup encryption enabled: GPG symmetric encryption with a key stored separately from backup files
- [ ] Recovery procedure tested: restore latest backup to a staging instance and verify artifact count matches
- [ ] RTO target documented: < 4 hours from decision to restore
- [ ] RPO target documented: < 24 hours (last daily backup)
- [ ] Backup retention policy enforced: 30-day hot storage, 1-year cold storage (see `docs/BACKUP_RECOVERY.md`)

---

## 4. Rate Limiting

- [ ] Default rate limit (100 req/min per IP) confirmed active on all `/api/*` routes
- [ ] Auth/wallet rate limit (20 req/min per IP) confirmed active on `/api/wallet/*` routes
- [ ] Nginx `limit_req_zone` configured as a second layer of defense
- [ ] Rate limit behavior tested: verify 429 response after limit exceeded
- [ ] **Known limitation documented:** in-process limiter is not shared across workers; effective limit in 4-worker deployment is 400 req/min. Redis-backed limiter is planned for v1.2.0.

---

## 5. Secrets Management

- [ ] All secrets sourced from environment variables — no plaintext in source code, Dockerfile, or compose files
- [ ] Production `.env` file is not committed to git (confirmed via `.gitignore`)
- [ ] Secrets stored in a secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or equivalent) rather than a plain `.env` file on disk
- [ ] Key rotation schedule documented and first rotation date set (see `docs/KEY_MANAGEMENT.md`)
- [ ] Emergency key rotation procedure tested in staging (see `security/policies/key-rotation.md`)
- [ ] Solana upgrade authority keys are in hardware wallets (Ledger or equivalent) — not on the production server

---

## 6. Performance Targets

| Metric                         | Target       | Measurement Method                              |
|--------------------------------|--------------|-------------------------------------------------|
| p99 API latency (read)         | < 200 ms     | Prometheus `http_request_duration_seconds`       |
| p99 API latency (write)        | < 500 ms     | Prometheus `http_request_duration_seconds`       |
| `/health` response time        | < 50 ms      | Nginx access log + external monitor             |
| QR generation end-to-end       | < 100 ms     | Prometheus or manual test                       |
| Solana RPC query (cached)      | < 10 ms      | `db_query_duration_seconds` histogram           |
| Solana RPC query (uncached)    | < 500 ms     | Prometheus custom metric                        |
| Error rate (5xx)               | < 0.1%       | `http_requests_total{status=~"5.."}` / total   |
| Uptime SLO                     | 99.5%/month  | External uptime monitor                         |

- [ ] Load test performed with k6 or Locust: 100 concurrent users, 10 min duration — all targets met
- [ ] SQLite WAL mode enabled (`PRAGMA journal_mode=WAL`) for concurrent read performance
- [ ] DB indexes verified with `EXPLAIN QUERY PLAN` for primary query patterns

---

## 7. Capacity Planning

### Current capacity (single-node, 4 workers, SQLite)
- Estimated max write throughput: ~200 artifact registrations/minute
- Estimated max read throughput: ~2000 requests/minute
- SQLite database growth rate: ~1 MB per 10,000 artifacts (estimated)
- Disk space for `/app/data`: provision 10 GB minimum; monitor with alerting at 70% full

### Scaling triggers
- Disk usage > 70%: add storage or archive old data
- p99 latency > 500 ms sustained: scale uvicorn workers (if CPU-bound) or move to PostgreSQL (if I/O-bound)
- Error rate > 0.5%: immediate investigation; scale or reduce traffic

---

## 8. Operational Procedures

- [ ] Runbook available and reviewed: `docs/RUNBOOK.md`
- [ ] Incident response playbooks reviewed: `docs/INCIDENT_RESPONSE.md`
- [ ] On-call rotation defined with at least 2 people available (see `docs/MONITORING.md`)
- [ ] Deployment procedure documented and tested: `docs/DEPLOYMENT.md`
- [ ] Rollback procedure tested: can revert to previous image tag within 10 minutes
- [ ] Database migration procedure tested: `make migrate` idempotent and non-destructive

---

## 9. Compliance

- [ ] GDPR data minimization reviewed: only `owner_email` is PII; stored encrypted if `FIELD_ENCRYPTION_KEY` set
- [ ] Right-to-deletion procedure documented: `security/policies/data-retention.md`
- [ ] Privacy policy link displayed in frontend
- [ ] Not-a-financial-product disclaimer displayed prominently (see `docs/COMPLIANCE.md`)
- [ ] Cookie policy reviewed: no tracking cookies; session cookies are HttpOnly + Secure + SameSite=Strict

---

## Sign-off

| Area                | Reviewed By | Date       | Status |
|---------------------|-------------|------------|--------|
| Security hardening  |             |            |        |
| Observability       |             |            |        |
| Backup/recovery     |             |            |        |
| Rate limiting       |             |            |        |
| Secrets management  |             |            |        |
| Performance targets |             |            |        |
| Capacity planning   |             |            |        |
| Operational procs   |             |            |        |
| Compliance          |             |            |        |

**Go/No-Go Decision:**

- [ ] GO — all items checked; deployment approved
- [ ] CONDITIONAL GO — outstanding items tracked in `reports/production_readiness_report.md` with accepted risk
- [ ] NO GO — blocking items must be resolved first

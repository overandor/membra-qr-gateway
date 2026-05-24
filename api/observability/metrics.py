"""Prometheus counters, histograms, and gauges.

All metrics are registered at import time.  Import this module once in your
application factory to ensure they are registered before any scrape.
"""
from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

# ── HTTP ──────────────────────────────────────────────────────────────────────

HTTP_REQUESTS_TOTAL = Counter(
    "membra_http_requests_total",
    "Total HTTP requests received",
    ["method", "path", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "membra_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

HTTP_ACTIVE_CONNECTIONS = Gauge(
    "membra_http_active_connections",
    "Number of currently active HTTP connections",
)

# ── Artifacts ─────────────────────────────────────────────────────────────────

ARTIFACTS_CREATED = Counter(
    "membra_artifacts_created_total",
    "Total QR artifacts created",
)

ARTIFACT_SCANS = Counter(
    "membra_artifact_scans_total",
    "Total gateway scan events recorded",
)

# ── MEMBRA events ─────────────────────────────────────────────────────────────

MEMBRA_EVENTS_INGESTED = Counter(
    "membra_events_ingested_total",
    "Total canonical MEMBRA events ingested",
)

# ── Auth ──────────────────────────────────────────────────────────────────────

AUTH_ATTEMPTS = Counter(
    "membra_auth_attempts_total",
    "Total authentication attempts",
)

AUTH_FAILURES = Counter(
    "membra_auth_failures_total",
    "Total failed authentication attempts",
)

RATE_LIMIT_HITS = Counter(
    "membra_rate_limit_hits_total",
    "Total requests rejected by rate limiter",
    ["route_group"],
)

# ── Protocol ──────────────────────────────────────────────────────────────────

PROTOCOL_QUERIES = Counter(
    "membra_protocol_queries_total",
    "Total protocol state queries",
    ["program"],
)

CHAIN_RPC_LATENCY = Histogram(
    "membra_chain_rpc_latency_seconds",
    "Solana JSON-RPC call latency",
    ["method"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)

CHAIN_RPC_ERRORS = Counter(
    "membra_chain_rpc_errors_total",
    "Total Solana RPC errors",
    ["method"],
)

# ── Admin ─────────────────────────────────────────────────────────────────────

ADMIN_OPERATIONS = Counter(
    "membra_admin_operations_total",
    "Total admin operations performed",
    ["operation"],
)

# ── Telemetry ────────────────────────────────────────────────────────────────

CLIENT_EVENTS_INGESTED = Counter(
    "membra_client_events_ingested_total",
    "Total client-side telemetry events accepted",
    ["event_name"],
)

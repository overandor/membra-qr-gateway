"""MEMBRA QR Gateway — proof, wallet, artifact, and scan gateway.

Runtime for registering public QR/NFC artifacts, ingesting canonical MEMBRA events,
recording scan/proof events, exporting registers, and exposing Stripe hooks.
No private keys or seed phrases are accepted or displayed.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import hmac
import json
import logging
import math
import os
import random
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any

import stripe
import uvicorn
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

load_dotenv()

APP_NAME = "MEMBRA QR Gateway"
APP_VERSION = "1.2.0"
DB_PATH = Path(os.getenv("DB_PATH", "/tmp/membra_qr_gateway.sqlite3"))
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:7860").rstrip("/")
MEMBRA_EVENT_SECRET = os.getenv("MEMBRA_EVENT_SECRET", "")
PUBLIC_SUPPORT_WALLET = os.getenv("PUBLIC_SUPPORT_WALLET", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")
_ADMIN_KEY = os.getenv("ADMIN_API_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
_ENV = os.getenv("ENV", "development")
_PRODUCTION = _ENV.lower() in ("production", "prod", "staging")

stripe.api_key = STRIPE_SECRET_KEY or None

# ── Structured JSON logging ──────────────────────────────────────────────────
class _JSONFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "rid"):
            log["rid"] = record.rid
        if record.exc_info:
            log["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log, default=str)


_handler = logging.StreamHandler()
_handler.setFormatter(_JSONFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger("membra")

# Rate limiter backed by in-memory storage (swap to Redis in production)
limiter = Limiter(key_func=get_remote_address)


def _validate_startup() -> None:
    """Fail fast in production if required secrets are missing."""
    if _PRODUCTION:
        missing = []
        if not _ADMIN_KEY:
            missing.append("ADMIN_API_KEY")
        if not MEMBRA_EVENT_SECRET:
            missing.append("MEMBRA_EVENT_SECRET")
        if missing:
            logger.error("PRODUCTION STARTUP BLOCKED: missing secrets: %s", ", ".join(missing))
            raise RuntimeError(f"Missing required secrets in production: {', '.join(missing)}")
        logger.info("Production secrets validated")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("%s v%s starting in %s mode", APP_NAME, APP_VERSION, _ENV)
    _validate_startup()
    init_db()
    logger.info("Database initialized at %s", DB_PATH)
    yield
    logger.info("%s shutting down gracefully", APP_NAME)


api = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)
api.state.limiter = limiter
api.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class ArtifactIn(BaseModel):
    owner_email: str = Field(default="", max_length=256)
    artifact_title: str = Field(..., min_length=1, max_length=256)
    artifact_type: str = Field(default="proofbook", max_length=64)
    destination_url: str = Field(..., max_length=2048)
    public_wallet: str = Field(default="", max_length=128)
    provenance_notes: str = Field(default="", max_length=4096)
    consent_scope: str = Field(default="public hash, timestamp, QR redirect, consented metadata only", max_length=512)


class CheckoutIn(BaseModel):
    email: str
    artifact_id: str | None = None


class MembraEventIn(BaseModel):
    event_id: str
    event_type: str
    source_module: str
    subject_type: str
    subject_id: str
    owner_id: str | None = None
    correlation_id: str | None = None
    causation_id: str | None = None
    created_at: str
    consent_scope: str | None = None
    risk_level: str = "normal"
    payload: dict[str, Any] = Field(default_factory=dict)
    proof_hash: str | None = None
    signature: str | None = None


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def db_tx() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def verify_event_signature(event: dict[str, Any]) -> bool:
    if not MEMBRA_EVENT_SECRET:
        return True
    supplied = event.get("signature") or ""
    unsigned = dict(event)
    unsigned["signature"] = None
    expected = "hmac_sha256:" + hmac.new(MEMBRA_EVENT_SECRET.encode("utf-8"), canonical(unsigned).encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(supplied, expected)


def init_db() -> None:
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS artifacts(
          artifact_id TEXT PRIMARY KEY,
          owner_email TEXT,
          artifact_title TEXT,
          artifact_type TEXT,
          destination_url TEXT,
          public_wallet TEXT,
          provenance_notes TEXT,
          consent_scope TEXT,
          artifact_hash TEXT,
          qr_url TEXT,
          status TEXT,
          stripe_session_id TEXT,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS gateway_events(event_id TEXT PRIMARY KEY, artifact_id TEXT, event_type TEXT, payload_json TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS events(
          event_id TEXT PRIMARY KEY,
          event_type TEXT,
          source_module TEXT,
          subject_type TEXT,
          subject_id TEXT,
          owner_id TEXT,
          risk_level TEXT,
          proof_hash TEXT,
          signature TEXT,
          payload_json TEXT,
          status TEXT,
          created_at TEXT,
          ingested_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_qr_events_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_qr_events_subject ON events(subject_type, subject_id);
        CREATE TABLE IF NOT EXISTS token_sales(
          sale_id TEXT PRIMARY KEY,
          artifact_id TEXT,
          name TEXT,
          symbol TEXT,
          max_supply REAL,
          initial_price REAL,
          max_bonus_pct REAL,
          decay_lambda REAL,
          total_raised REAL DEFAULT 0,
          total_sold REAL DEFAULT 0,
          reward_pool_balance REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS contributions(
          contribution_id TEXT PRIMARY KEY,
          sale_id TEXT,
          buyer_wallet TEXT,
          currency TEXT,
          amount_native REAL,
          amount_usd REAL,
          base_tokens REAL,
          bonus_tokens REAL,
          total_tokens REAL,
          bonus_pct REAL,
          split_treasury REAL,
          split_protocol REAL,
          split_validator REAL,
          split_reward_pool REAL,
          position INTEGER,
          receipt_hash TEXT,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS rebate_claims(
          claim_id TEXT PRIMARY KEY,
          contribution_id TEXT,
          sale_id TEXT,
          buyer_wallet TEXT,
          claim_amount REAL,
          status TEXT DEFAULT 'pending',
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS holder_balances(
          wallet TEXT NOT NULL,
          sale_id TEXT NOT NULL,
          balance REAL DEFAULT 0,
          updated_at TEXT,
          PRIMARY KEY (wallet, sale_id)
        );
        CREATE TABLE IF NOT EXISTS rebase_epochs(
          epoch_id TEXT PRIMARY KEY,
          sale_id TEXT,
          epoch_number INTEGER,
          market_price REAL,
          denomination REAL,
          rebase_factor REAL,
          holder_count INTEGER,
          selected_count INTEGER,
          holder_multiplier REAL,
          bonus_issued REAL,
          total_supply_before REAL,
          total_supply_after REAL,
          triggered_at TEXT
        );
        CREATE TABLE IF NOT EXISTS holder_rebase_events(
          event_id TEXT PRIMARY KEY,
          epoch_id TEXT,
          sale_id TEXT,
          wallet TEXT,
          balance_before REAL,
          bonus_tokens REAL,
          balance_after REAL,
          created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_rebase_sale ON rebase_epochs(sale_id);
        CREATE INDEX IF NOT EXISTS idx_hre_epoch ON holder_rebase_events(epoch_id);
        CREATE INDEX IF NOT EXISTS idx_hre_wallet ON holder_rebase_events(wallet, sale_id);
        """)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if _PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = str(uuid.uuid4())[:8]
        request.state.rid = rid
        start = time.time()
        try:
            response = await call_next(request)
            duration = (time.time() - start) * 1000
            logger.info("rid=%s method=%s path=%s status=%d ms=%.2f", rid, request.method, request.url.path, response.status_code, duration)
            response.headers["X-Request-ID"] = rid
            return response
        except Exception as exc:
            duration = (time.time() - start) * 1000
            logger.error("rid=%s method=%s path=%s error=%s ms=%.2f", rid, request.method, request.url.path, exc, duration)
            raise


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    MAX_SIZE = 1_048_576  # 1 MB

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.MAX_SIZE:
                return JSONResponse({"detail": "Request body too large"}, status_code=413)
        return await call_next(request)


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    MUTATIONS = {"POST", "PUT", "PATCH", "DELETE"}

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method in self.MUTATIONS and request.url.path.startswith("/api/"):
            rid = getattr(request.state, "rid", "—")
            client = request.client.host if request.client else "—"
            body = ""
            if request.method in ("POST", "PUT", "PATCH"):
                try:
                    body_bytes = await request.body()
                    body = hashlib.sha256(body_bytes).hexdigest()[:16]
                except Exception:
                    body = "<unavailable>"
            logger.info(
                "audit rid=%s client=%s method=%s path=%s status=%d body_sha=%s",
                rid, client, request.method, request.url.path, response.status_code, body,
                extra={"rid": rid},
            )
        return response


api.add_middleware(SecurityHeadersMiddleware)
api.add_middleware(RequestLoggingMiddleware)
api.add_middleware(MaxBodySizeMiddleware)
api.add_middleware(AuditLoggingMiddleware)


def artifact_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def build_artifact(data: ArtifactIn) -> dict[str, Any]:
    artifact_id = "art_" + uuid.uuid4().hex[:12]
    qr_url = f"{APP_BASE_URL}/g/{artifact_id}"
    public_payload = {
        "artifact_id": artifact_id,
        "artifact_title": data.artifact_title,
        "artifact_type": data.artifact_type,
        "destination_url": data.destination_url,
        "public_wallet": data.public_wallet or PUBLIC_SUPPORT_WALLET,
        "consent_scope": data.consent_scope,
        "provenance_notes": data.provenance_notes,
        "created_at": now(),
    }
    digest = artifact_hash(public_payload)
    manifest = {
        **public_payload,
        "artifact_hash": digest,
        "qr_url": qr_url,
        "status": "registered_pending_external_verification",
        "safety": {
            "private_key_policy": "private keys and seed phrases are never collected, stored, rendered, or requested",
            "onchain_policy": "public ledger should store hashes, timestamps, and consented metadata only",
        },
    }
    with db() as conn:
        conn.execute("INSERT INTO artifacts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (artifact_id, data.owner_email, data.artifact_title, data.artifact_type, data.destination_url, data.public_wallet or PUBLIC_SUPPORT_WALLET, data.provenance_notes, data.consent_scope, digest, qr_url, manifest["status"], None, manifest["created_at"]))
        conn.execute("INSERT INTO gateway_events VALUES(?,?,?,?,?)", ("evt_" + uuid.uuid4().hex[:12], artifact_id, "artifact_registered", json.dumps(manifest, default=str), now()))
    return manifest


def artifact_rows() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT artifact_id,artifact_title,artifact_type,artifact_hash,qr_url,status,created_at FROM artifacts ORDER BY created_at DESC LIMIT 200").fetchall()
    return [dict(r) for r in rows]


def event_rows() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM events ORDER BY ingested_at DESC LIMIT 500").fetchall()
    return [dict(r) for r in rows]


def export_artifacts() -> str:
    rows = artifact_rows()
    path = "/tmp/membra_qr_artifacts.csv"
    if rows:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader(); writer.writerows(rows)
    else:
        Path(path).write_text("artifact_id,artifact_title,status\n", encoding="utf-8")
    return path


def artifact_from_event(data: MembraEventIn) -> dict[str, Any] | None:
    if data.event_type not in {"visibility_confirmed", "qr_artifact_created"}:
        return None
    payload = data.payload or {}
    title = payload.get("artifact_title") or payload.get("title") or f"MEMBRA {data.subject_type} {data.subject_id}"
    destination = payload.get("destination_url") or payload.get("qr_url") or f"{APP_BASE_URL}/g/{data.subject_id}"
    return build_artifact(
        ArtifactIn(
            owner_email=payload.get("owner_email", ""),
            artifact_title=title,
            artifact_type=data.subject_type,
            destination_url=destination,
            public_wallet=payload.get("public_wallet", ""),
            provenance_notes=f"Created from MEMBRA event {data.event_id} ({data.event_type})",
            consent_scope=data.consent_scope or "canonical MEMBRA event envelope and QR provenance metadata only",
        )
    )



def _db_health() -> dict[str, Any]:
    try:
        with db() as conn:
            conn.execute("SELECT 1")
        return {"db": "connected", "db_path": str(DB_PATH)}
    except Exception as exc:
        return {"db": "error", "detail": str(exc)}


@api.get("/api/health")
@limiter.limit("30/minute")
def health(request: Request):
    db_status = _db_health()
    ok = db_status["db"] == "connected"
    return {
        "ok": ok,
        "app": APP_NAME,
        "version": APP_VERSION,
        "stripe_configured": bool(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_ID),
        "env": _ENV,
        **db_status,
    }


@api.get("/api/ready")
@limiter.limit("30/minute")
def ready(request: Request):
    warnings = [] if MEMBRA_EVENT_SECRET else ["MEMBRA_EVENT_SECRET not configured; signed event verification is permissive"]
    return {"ok": True, "ready": True, "warnings": warnings, "artifact_count": len(artifact_rows()), "event_count": len(event_rows())}


@api.get("/api/artifacts")
@limiter.limit("60/minute")
def list_artifacts(request: Request):
    return {"artifacts": artifact_rows()}


@api.post("/api/artifacts")
@limiter.limit("10/minute")
def create_artifact(request: Request, data: ArtifactIn):
    return build_artifact(data)


@api.post("/api/events/ingest")
@limiter.limit("30/minute")
def ingest_event(request: Request, data: MembraEventIn):
    event = data.model_dump()
    if not verify_event_signature(event):
        raise HTTPException(401, "invalid event signature")
    with db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (data.event_id, data.event_type, data.source_module, data.subject_type, data.subject_id, data.owner_id, data.risk_level, data.proof_hash, data.signature, json.dumps(event, default=str), "ingested", data.created_at, now()),
        )
    artifact = artifact_from_event(data)
    return {"ok": True, "event_id": data.event_id, "artifact": artifact}


@api.get("/api/events")
@limiter.limit("60/minute")
def list_events(request: Request):
    return {"events": event_rows()}


def ui_checkout(email: str, artifact_id: str) -> str:
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        raise HTTPException(500, "Stripe is not fully configured")
    try:
        session = stripe.checkout.Session.create(
            customer_email=email or None,
            metadata={"artifact_id": artifact_id},
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            mode="payment",
            success_url=f"{APP_BASE_URL}/g/{artifact_id}?checkout=success",
            cancel_url=f"{APP_BASE_URL}/g/{artifact_id}?checkout=cancel",
        )
        return session.url or ""
    except Exception as exc:
        logger.error("Stripe checkout failed: %s", exc)
        raise HTTPException(502, f"Stripe error: {exc}")


@api.post("/api/stripe/create-checkout-session")
@limiter.limit("10/minute")
def checkout(request: Request, data: CheckoutIn):
    return {"url": ui_checkout(data.email, data.artifact_id or "")}


@api.post("/api/stripe/webhook")
@limiter.limit("60/minute")
async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None)):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "STRIPE_WEBHOOK_SECRET is not configured")
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise HTTPException(400, str(exc))
    obj = event["data"]["object"]
    artifact_id = obj.get("metadata", {}).get("artifact_id")
    if artifact_id and event["type"] == "checkout.session.completed":
        with db() as conn:
            conn.execute("UPDATE artifacts SET status=? WHERE artifact_id=?", ("funded_pending_notary_or_public_release", artifact_id))
            conn.execute("INSERT INTO gateway_events VALUES(?,?,?,?,?)", ("evt_" + uuid.uuid4().hex[:12], artifact_id, event["type"], json.dumps(obj, default=str), now()))
    return JSONResponse({"received": True})


@api.get("/g/{artifact_id}")
@limiter.limit("120/minute")
def gateway_scan(request: Request, artifact_id: str):
    if not artifact_id or len(artifact_id) > 64:
        raise HTTPException(400, "Invalid artifact ID")
    with db() as conn:
        row = conn.execute("SELECT destination_url,artifact_hash FROM artifacts WHERE artifact_id=?", (artifact_id,)).fetchone()
        conn.execute("INSERT INTO gateway_events VALUES(?,?,?,?,?)", ("evt_" + uuid.uuid4().hex[:12], artifact_id, "scan", "{}", now()))
    if not row:
        raise HTTPException(404, "Artifact not found")
    return PlainTextResponse(f"MEMBRA gateway scan recorded for {artifact_id}. Hash: {row['artifact_hash']}. Destination: {row['destination_url']}")


# ── Tokenomics + Rebase constants ───────────────────────────────────────────
_DEFAULT_MAX_SUPPLY    = 10_000_000.0
_DEFAULT_INITIAL_PRICE = 0.10          # denomination: $0.10 (10 cents)
_DEFAULT_MAX_BONUS_PCT = 0.50
_DEFAULT_DECAY_LAMBDA  = 3.0
_SOL_USD_RATE          = 150.0         # indicative; replace with live feed in prod

DENOMINATION_PRICE     = 0.10          # $0.10 — the rebase peg reference
MARKET_PRICE_MIN       = 0.10          # floor
MARKET_PRICE_MAX       = 1.00          # ceiling
REBASE_INTERVAL_S      = 3 * 3600      # 3-hour epochs
REBASE_HOLDER_PCT      = 0.03          # 3 % of holders selected per epoch
HOLDER_MULTIPLIER_K    = 5_000.0       # more holders → bigger bonus: 1 + n/K × 0.4
MAX_REBASE_FACTOR      = 10.0          # cap factor at 10× (price=$1 at denom=$0.10)


def _rebase_market_price() -> float:
    import random
    # 65 % chance in lower half ($0.10–$0.55), 35 % in upper ($0.55–$1.00)
    if random.random() < 0.65:
        return random.uniform(MARKET_PRICE_MIN, 0.55)
    return random.uniform(0.55, MARKET_PRICE_MAX)


def _rebase_factor(market_price: float) -> float:
    return min(MAX_REBASE_FACTOR, market_price / DENOMINATION_PRICE)


def _holder_multiplier(holder_count: int) -> float:
    return 1.0 + (holder_count / HOLDER_MULTIPLIER_K) * 0.4


def _curve_price(total_sold: float, max_supply: float, initial_price: float) -> float:
    s = total_sold / max_supply if max_supply > 0 else 0.0
    return initial_price * (1.0 + s)


def _decay_bonus_pct(max_bonus_pct: float, decay_lambda: float, total_sold: float, max_supply: float) -> float:
    s = total_sold / max_supply if max_supply > 0 else 0.0
    return max_bonus_pct * math.exp(-decay_lambda * s)


def _contribution_receipt_hash(contribution_id: str, sale_id: str, buyer_wallet: str, total_tokens: float, created_at: str) -> str:
    raw = json.dumps({
        "contribution_id": contribution_id,
        "sale_id": sale_id,
        "buyer_wallet": buyer_wallet,
        "total_tokens": total_tokens,
        "created_at": created_at,
    }, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class TokenSaleIn(BaseModel):
    artifact_id: str = ""
    name: str = Field(..., min_length=1, max_length=128)
    symbol: str = Field(..., min_length=1, max_length=16)
    max_supply: float = Field(default=_DEFAULT_MAX_SUPPLY, gt=0, le=1_000_000_000_000)
    initial_price: float = Field(default=_DEFAULT_INITIAL_PRICE, gt=0, le=1_000)
    max_bonus_pct: float = Field(default=_DEFAULT_MAX_BONUS_PCT, ge=0, le=10)
    decay_lambda: float = Field(default=_DEFAULT_DECAY_LAMBDA, ge=0, le=100)


class ContributionIn(BaseModel):
    sale_id: str = Field(..., min_length=1, max_length=64)
    buyer_wallet: str = Field(..., min_length=1, max_length=128)
    currency: str = Field(default="USDC", pattern=r"^(SOL|USDC)$")
    amount: float = Field(..., gt=0, le=1_000_000_000)  # native units (SOL or USDC)
    sol_usd_rate: float = Field(default=_SOL_USD_RATE, gt=0, le=1_000_000)


class RebateClaimIn(BaseModel):
    sale_id: str = Field(..., min_length=1, max_length=64)
    contribution_id: str = Field(..., min_length=1, max_length=64)
    buyer_wallet: str = Field(..., min_length=1, max_length=128)


class RebaseTriggerIn(BaseModel):
    sale_id: str = Field(..., min_length=1, max_length=64)
    admin_key: str = Field(..., min_length=1, max_length=256)
    market_price: float | None = Field(default=None, gt=0, le=1_000_000)


@api.post("/api/token-sale")
@limiter.limit("10/minute")
def create_token_sale(request: Request, data: TokenSaleIn):
    sale_id = "sale_" + uuid.uuid4().hex[:12]
    ts = now()
    with db() as conn:
        conn.execute(
            "INSERT INTO token_sales VALUES(?,?,?,?,?,?,?,?,0,0,0,'active',?)",
            (sale_id, data.artifact_id, data.name, data.symbol, data.max_supply,
             data.initial_price, data.max_bonus_pct, data.decay_lambda, ts),
        )
    return {"sale_id": sale_id, "name": data.name, "symbol": data.symbol, "created_at": ts}


@api.get("/api/token-sale/{sale_id}")
@limiter.limit("60/minute")
def get_token_sale(request: Request, sale_id: str):
    with db() as conn:
        row = conn.execute("SELECT * FROM token_sales WHERE sale_id=?", (sale_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Sale not found")
    row = dict(row)
    row["current_price"] = _curve_price(row["total_sold"], row["max_supply"], row["initial_price"])
    row["current_bonus_pct"] = _decay_bonus_pct(row["max_bonus_pct"], row["decay_lambda"], row["total_sold"], row["max_supply"])
    row["supply_fraction"] = row["total_sold"] / row["max_supply"] if row["max_supply"] > 0 else 0.0
    return row


@api.post("/api/token-sale/calculate")
@limiter.limit("60/minute")
def calculate_contribution(request: Request, data: ContributionIn):
    with db() as conn:
        sale = conn.execute("SELECT * FROM token_sales WHERE sale_id=?", (data.sale_id,)).fetchone()
    if not sale:
        raise HTTPException(404, "Sale not found")
    sale = dict(sale)
    amount_usd = data.amount * data.sol_usd_rate if data.currency.upper() == "SOL" else data.amount
    current_price = _curve_price(sale["total_sold"], sale["max_supply"], sale["initial_price"])
    bonus_pct = _decay_bonus_pct(sale["max_bonus_pct"], sale["decay_lambda"], sale["total_sold"], sale["max_supply"])
    base_tokens = amount_usd / current_price if current_price > 0 else 0.0
    bonus_tokens = base_tokens * bonus_pct
    total_tokens = base_tokens + bonus_tokens
    return {
        "amount_usd": amount_usd,
        "current_price": current_price,
        "bonus_pct": bonus_pct,
        "base_tokens": base_tokens,
        "bonus_tokens": bonus_tokens,
        "total_tokens": total_tokens,
        "split": {
            "treasury": amount_usd * 0.80,
            "protocol": amount_usd * 0.10,
            "validator": amount_usd * 0.05,
            "reward_pool": amount_usd * 0.05,
        },
        "guardrail": "No guaranteed profit. Cashback capped, disclosed, pool-limited, claimable only if funded.",
    }


@api.post("/api/token-sale/contribute")
@limiter.limit("30/minute")
def record_contribution(request: Request, data: ContributionIn):
    with db_tx() as conn:
        sale = conn.execute("SELECT * FROM token_sales WHERE sale_id=? AND status='active'", (data.sale_id,)).fetchone()
        if not sale:
            raise HTTPException(404, "Active sale not found")
        sale = dict(sale)
        amount_usd = data.amount * data.sol_usd_rate if data.currency.upper() == "SOL" else data.amount
        current_price = _curve_price(sale["total_sold"], sale["max_supply"], sale["initial_price"])
        bonus_pct = _decay_bonus_pct(sale["max_bonus_pct"], sale["decay_lambda"], sale["total_sold"], sale["max_supply"])
        base_tokens = amount_usd / current_price if current_price > 0 else 0.0
        bonus_tokens = base_tokens * bonus_pct
        total_tokens = base_tokens + bonus_tokens
        split_treasury = amount_usd * 0.80
        split_protocol = amount_usd * 0.10
        split_validator = amount_usd * 0.05
        split_reward_pool = amount_usd * 0.05
        contribution_id = "ctr_" + uuid.uuid4().hex[:12]
        ts = now()
        receipt_hash = _contribution_receipt_hash(contribution_id, data.sale_id, data.buyer_wallet, total_tokens, ts)
        position = (conn.execute("SELECT COUNT(*) FROM contributions WHERE sale_id=?", (data.sale_id,)).fetchone()[0] or 0) + 1
        conn.execute(
            "INSERT INTO contributions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (contribution_id, data.sale_id, data.buyer_wallet, data.currency.upper(),
             data.amount, amount_usd, base_tokens, bonus_tokens, total_tokens, bonus_pct,
             split_treasury, split_protocol, split_validator, split_reward_pool,
             position, receipt_hash, ts),
        )
        conn.execute(
            "UPDATE token_sales SET total_raised=total_raised+?, total_sold=total_sold+?, reward_pool_balance=reward_pool_balance+? WHERE sale_id=?",
            (amount_usd, total_tokens, split_reward_pool, data.sale_id),
        )
        conn.commit()
    return {
        "contribution_id": contribution_id,
        "position": position,
        "base_tokens": base_tokens,
        "bonus_tokens": bonus_tokens,
        "total_tokens": total_tokens,
        "receipt_hash": receipt_hash,
        "split": {
            "treasury": split_treasury,
            "protocol": split_protocol,
            "validator": split_validator,
            "reward_pool": split_reward_pool,
        },
        "guardrail": "No guaranteed profit. Cashback capped, disclosed, pool-limited, claimable only if funded.",
    }


@api.get("/api/token-sale/{sale_id}/receipt/{contribution_id}")
@limiter.limit("60/minute")
def get_receipt(request: Request, sale_id: str, contribution_id: str):
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM contributions WHERE contribution_id=? AND sale_id=?",
            (contribution_id, sale_id),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Receipt not found")
    return dict(row)


@api.post("/api/token-sale/claim")
@limiter.limit("30/minute")
def submit_claim(request: Request, data: RebateClaimIn):
    with db_tx() as conn:
        ctr = conn.execute(
            "SELECT * FROM contributions WHERE contribution_id=? AND sale_id=? AND buyer_wallet=?",
            (data.contribution_id, data.sale_id, data.buyer_wallet),
        ).fetchone()
        if not ctr:
            raise HTTPException(404, "Contribution not found for this buyer")
        sale = conn.execute("SELECT * FROM token_sales WHERE sale_id=?", (data.sale_id,)).fetchone()
        if not sale:
            raise HTTPException(404, "Sale not found")
        if dict(sale)["status"] != "finalized":
            raise HTTPException(400, "Claims only open after sale is finalized")
        existing = conn.execute(
            "SELECT claim_id FROM rebate_claims WHERE contribution_id=?", (data.contribution_id,)
        ).fetchone()
        if existing:
            raise HTTPException(409, "Claim already submitted for this contribution")
        ctr = dict(ctr)
        sale = dict(sale)
        claim_amount = min(ctr["split_reward_pool"], sale["reward_pool_balance"])
        claim_id = "clm_" + uuid.uuid4().hex[:12]
        ts = now()
        conn.execute(
            "INSERT INTO rebate_claims VALUES(?,?,?,?,?,'pending',?)",
            (claim_id, data.contribution_id, data.sale_id, data.buyer_wallet, claim_amount, ts),
        )
        conn.execute(
            "UPDATE token_sales SET reward_pool_balance=reward_pool_balance-? WHERE sale_id=?",
            (claim_amount, data.sale_id),
        )
        conn.commit()
    return {
        "claim_id": claim_id,
        "claim_amount": claim_amount,
        "status": "pending",
        "guardrail": "Rebate is cashback only. Not profit. Not investment return. Pool-limited.",
    }


@api.get("/api/token-sale/{sale_id}/claims")
@limiter.limit("60/minute")
def list_claims(request: Request, sale_id: str):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM rebate_claims WHERE sale_id=? ORDER BY created_at DESC",
            (sale_id,),
        ).fetchall()
    return {"claims": [dict(r) for r in rows]}


def _verify_admin(key: str) -> None:
    if not _ADMIN_KEY:
        raise HTTPException(403, "Admin API key not configured")
    if key != _ADMIN_KEY:
        raise HTTPException(403, "invalid admin key")


@api.post("/api/rebase/trigger")
@limiter.limit("10/minute")
def trigger_rebase(request: Request, data: RebaseTriggerIn):
    _verify_admin(data.admin_key)
    with db_tx() as conn:
        sale = conn.execute("SELECT * FROM token_sales WHERE sale_id=?", (data.sale_id,)).fetchone()
        if not sale:
            raise HTTPException(404, "Sale not found")
        sale = dict(sale)

        # Check cooldown
        last = conn.execute(
            "SELECT triggered_at FROM rebase_epochs WHERE sale_id=? ORDER BY triggered_at DESC LIMIT 1",
            (data.sale_id,),
        ).fetchone()
        if last:
            elapsed = (dt.datetime.fromisoformat(now()) - dt.datetime.fromisoformat(last["triggered_at"])).total_seconds()
            if elapsed < REBASE_INTERVAL_S:
                remaining = int(REBASE_INTERVAL_S - elapsed)
                raise HTTPException(429, f"Rebase cooldown: {remaining}s remaining")

        # Market price
        mkt = data.market_price if data.market_price is not None else _rebase_market_price()
        mkt = max(MARKET_PRICE_MIN, min(MARKET_PRICE_MAX, mkt))
        factor = _rebase_factor(mkt)

        # Holders
        holders = conn.execute(
            "SELECT wallet, balance FROM holder_balances WHERE sale_id=? AND balance > 0",
            (data.sale_id,),
        ).fetchall()
        holder_count = len(holders)
        mult = _holder_multiplier(holder_count)
        n_select = max(1, int(holder_count * REBASE_HOLDER_PCT))
        selected = random.sample(holders, min(n_select, holder_count)) if holders else []

        epoch_number = (conn.execute(
            "SELECT COUNT(*) FROM rebase_epochs WHERE sale_id=?", (data.sale_id,)
        ).fetchone()[0] or 0) + 1
        epoch_id = "epk_" + uuid.uuid4().hex[:12]
        ts = now()
        total_supply_before = sale["total_sold"] + (
            conn.execute("SELECT COALESCE(SUM(bonus_issued),0) FROM rebase_epochs WHERE sale_id=?", (data.sale_id,)).fetchone()[0] or 0
        )
        total_bonus = 0.0
        events_out = []

        for row in selected:
            bal = row["balance"]
            bonus = bal * (factor - 1.0) * mult
            new_bal = bal + bonus
            conn.execute(
                "UPDATE holder_balances SET balance=?, updated_at=? WHERE wallet=? AND sale_id=?",
                (new_bal, ts, row["wallet"], data.sale_id),
            )
            evt_id = "hre_" + uuid.uuid4().hex[:10]
            conn.execute(
                "INSERT INTO holder_rebase_events VALUES(?,?,?,?,?,?,?,?)",
                (evt_id, epoch_id, data.sale_id, row["wallet"], bal, bonus, new_bal, ts),
            )
            total_bonus += bonus
            events_out.append({"wallet": row["wallet"], "balance_before": bal, "bonus_tokens": bonus, "balance_after": new_bal})

        total_supply_after = total_supply_before + total_bonus
        conn.execute(
            "INSERT INTO rebase_epochs VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (epoch_id, data.sale_id, epoch_number, mkt, DENOMINATION_PRICE, factor,
             holder_count, len(selected), mult, total_bonus,
             total_supply_before, total_supply_after, ts),
        )
        conn.commit()

    return {
        "epoch_id": epoch_id,
        "epoch_number": epoch_number,
        "market_price": mkt,
        "denomination": DENOMINATION_PRICE,
        "rebase_factor": factor,
        "holder_count": holder_count,
        "selected_count": len(selected),
        "holder_multiplier": mult,
        "bonus_issued": total_bonus,
        "total_supply_before": total_supply_before,
        "total_supply_after": total_supply_after,
        "winners": events_out,
        "guardrail": "Rebase selects 3% of holders randomly. Not guaranteed. Denomination $0.10 is reference only.",
    }


@api.get("/api/rebase/{sale_id}/state")
@limiter.limit("60/minute")
def rebase_state(request: Request, sale_id: str):
    with db() as conn:
        last = conn.execute(
            "SELECT * FROM rebase_epochs WHERE sale_id=? ORDER BY triggered_at DESC LIMIT 1",
            (sale_id,),
        ).fetchone()
        holder_count = conn.execute(
            "SELECT COUNT(*) FROM holder_balances WHERE sale_id=? AND balance > 0", (sale_id,)
        ).fetchone()[0] or 0
    if not last:
        return {"sale_id": sale_id, "epoch_count": 0, "denomination": DENOMINATION_PRICE,
                "market_price_min": MARKET_PRICE_MIN, "market_price_max": MARKET_PRICE_MAX,
                "rebase_interval_seconds": REBASE_INTERVAL_S, "holder_count": holder_count}
    last = dict(last)
    elapsed = (dt.datetime.fromisoformat(now()) - dt.datetime.fromisoformat(last["triggered_at"])).total_seconds()
    last["next_rebase_in_seconds"] = max(0, int(REBASE_INTERVAL_S - elapsed))
    last["holder_count"] = holder_count
    last["denomination"] = DENOMINATION_PRICE
    last["market_price_min"] = MARKET_PRICE_MIN
    last["market_price_max"] = MARKET_PRICE_MAX
    return last


@api.get("/api/rebase/{sale_id}/history")
@limiter.limit("60/minute")
def rebase_history(request: Request, sale_id: str, limit: int = 20):
    if limit < 1 or limit > 100:
        raise HTTPException(422, "limit must be between 1 and 100")
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM rebase_epochs WHERE sale_id=? ORDER BY epoch_number DESC LIMIT ?",
            (sale_id, limit),
        ).fetchall()
    return {"epochs": [dict(r) for r in rows]}


@api.get("/api/rebase/{sale_id}/wallet/{wallet}")
@limiter.limit("60/minute")
def wallet_rebase_events(request: Request, sale_id: str, wallet: str):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM holder_rebase_events WHERE sale_id=? AND wallet=? ORDER BY created_at DESC",
            (sale_id, wallet),
        ).fetchall()
        bal = conn.execute(
            "SELECT balance FROM holder_balances WHERE sale_id=? AND wallet=?", (sale_id, wallet)
        ).fetchone()
    return {
        "wallet": wallet,
        "current_balance": dict(bal)["balance"] if bal else 0,
        "rebase_events": [dict(r) for r in rows],
    }


@api.get("/api/export/db")
@limiter.limit("5/minute")
def export_db(request: Request, key: str = Header(default="")):
    _verify_admin(key)
    path = str(DB_PATH)
    import shutil
    backup_path = f"/tmp/membra_backup_{int(time.time())}.sqlite3"
    shutil.copy(path, backup_path)
    from fastapi.responses import FileResponse
    return FileResponse(backup_path, filename="membra_backup.sqlite3", media_type="application/octet-stream")


# ── LLM Inference (Pollinations AI proxy — free, no API key) ─────────────────
class LLMIn(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8192)
    model: str = Field(default="openai", max_length=64)
    system_prompt: str | None = Field(default=None, max_length=2048)


@api.post("/api/llm/inference")
@limiter.limit("30/minute")
def llm_inference(request: Request, data: LLMIn):
    """Proxy inference to Pollinations AI — free, anonymous, no API key."""
    import urllib.request
    import urllib.parse

    conversation = data.prompt
    if data.system_prompt:
        conversation = f"System: {data.system_prompt}\n\nUser: {data.prompt}"
    else:
        conversation = f"User: {data.prompt}"

    encoded = urllib.parse.quote(conversation)
    url = f"https://text.pollinations.ai/{encoded}?model={urllib.parse.quote(data.model)}&seed={int(time.time())}"

    try:
        req = urllib.request.Request(url, method="GET", headers={"Accept": "text/plain", "User-Agent": "MEMBRA-QR-Gateway/1.2"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode("utf-8")
        return {"response": text.strip(), "model": data.model, "source": "pollinations"}
    except urllib.error.HTTPError as exc:
        logger.error("LLM proxy HTTP error: %s", exc.code)
        raise HTTPException(502, f"LLM provider error: {exc.code}")
    except Exception as exc:
        logger.error("LLM proxy error: %s", exc)
        raise HTTPException(502, f"LLM inference failed: {exc}")


# ── Metrics ───────────────────────────────────────────────────────────────────
_metrics = {"requests_total": 0, "requests_4xx": 0, "requests_5xx": 0, "requests_latency_ms_sum": 0.0}


@api.get("/api/metrics")
@limiter.limit("60/minute")
def metrics(request: Request):
    rows = {
        "requests_total": _metrics["requests_total"],
        "requests_4xx": _metrics["requests_4xx"],
        "requests_5xx": _metrics["requests_5xx"],
        "requests_latency_ms_avg": round(_metrics["requests_latency_ms_sum"] / max(_metrics["requests_total"], 1), 2),
        "app": APP_NAME,
        "version": APP_VERSION,
        "env": _ENV,
    }
    return rows


@api.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    dur = (time.time() - start) * 1000
    _metrics["requests_total"] += 1
    _metrics["requests_latency_ms_sum"] += dur
    if 400 <= response.status_code < 500:
        _metrics["requests_4xx"] += 1
    elif response.status_code >= 500:
        _metrics["requests_5xx"] += 1
    return response


# ── CORS + startup ────────────────────────────────────────────────────────────
from fastapi.middleware.cors import CORSMiddleware

allow_origins = CORS_ORIGINS if CORS_ORIGINS else (["*"] if not _PRODUCTION else [])
if _PRODUCTION and not allow_origins:
    logger.warning("CORS_ORIGINS not set in production; CORS will be disabled")

api.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

app = api

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")), log_level="info")

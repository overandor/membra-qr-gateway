"""QR artifact routes.

POST /api/qr            — create artifact
GET  /api/qr            — list artifacts
GET  /api/qr/{id}       — get single artifact
GET  /g/{id}            — gateway scan redirect (public)

Also handles MEMBRA event ingest and Stripe webhooks (legacy paths preserved).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from typing import Any

import stripe
import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

from api.core.config import settings
from api.core.errors import NotFoundError
from api.db.session import get_db
from api.services.qr_service import (
    ArtifactIn,
    MembraEventIn,
    create_artifact,
    create_artifact_from_membra_event,
    get_artifact,
    list_artifacts,
    record_scan,
)
from api.services import notification_service
from api.observability.metrics import (
    ARTIFACTS_CREATED,
    ARTIFACT_SCANS,
    MEMBRA_EVENTS_INGESTED,
)

router = APIRouter()
log = structlog.get_logger(__name__)


def _ok(data: Any) -> dict:
    return {"ok": True, "data": data}


# ── Artifact CRUD ─────────────────────────────────────────────────────────────

@router.post("/qr", summary="Create a QR artifact")
async def create_qr_artifact(data: ArtifactIn, db=Depends(get_db)) -> dict:
    artifact = await create_artifact(db, data)
    ARTIFACTS_CREATED.inc()
    await notification_service.notify_artifact_created(artifact)
    return _ok(artifact)


@router.get("/qr", summary="List QR artifacts")
async def list_qr_artifacts(limit: int = 200, db=Depends(get_db)) -> dict:
    rows = await list_artifacts(db, min(limit, 500))
    return _ok({"artifacts": rows, "count": len(rows)})


@router.get("/qr/{artifact_id}", summary="Get a QR artifact")
async def get_qr_artifact(artifact_id: str, db=Depends(get_db)) -> dict:
    artifact = await get_artifact(db, artifact_id)
    return _ok(artifact)


# ── Gateway scan (public — no auth) ──────────────────────────────────────────

@router.get("/g/{artifact_id}", summary="Gateway scan endpoint (public)")
async def gateway_scan(artifact_id: str, db=Depends(get_db)) -> PlainTextResponse:
    try:
        row = await record_scan(db, artifact_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Artifact not found")
    ARTIFACT_SCANS.inc()
    await notification_service.notify_scan(artifact_id)
    return PlainTextResponse(
        f"MEMBRA gateway scan recorded for {artifact_id}. "
        f"Hash: {row['artifact_hash']}. Destination: {row['destination_url']}"
    )


# ── MEMBRA event ingest ───────────────────────────────────────────────────────

def _canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def _verify_event_signature(event: dict[str, Any]) -> bool:
    secret = settings.MEMBRA_EVENT_SECRET
    if not secret:
        return True  # permissive when unconfigured
    supplied = event.get("signature") or ""
    unsigned = dict(event)
    unsigned["signature"] = None
    expected = "hmac_sha256:" + hmac.new(
        secret.encode("utf-8"),
        _canonical(unsigned).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(supplied, expected)


@router.post("/events/ingest", summary="Ingest a canonical MEMBRA event")
async def ingest_event(data: MembraEventIn, db=Depends(get_db)) -> dict:
    event_dict = data.model_dump()
    if not _verify_event_signature(event_dict):
        raise HTTPException(status_code=401, detail="invalid event signature")

    import aiosqlite
    import datetime as dt

    ts = dt.datetime.now(dt.timezone.utc).isoformat()
    await db.execute(
        "INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            data.event_id,
            data.event_type,
            data.source_module,
            data.subject_type,
            data.subject_id,
            data.owner_id,
            data.risk_level,
            data.proof_hash,
            data.signature,
            json.dumps(event_dict, default=str),
            "ingested",
            data.created_at,
            ts,
        ),
    )
    await db.commit()

    artifact = await create_artifact_from_membra_event(db, data)
    MEMBRA_EVENTS_INGESTED.inc()
    return _ok({"event_id": data.event_id, "artifact": artifact})


@router.get("/events", summary="List ingested MEMBRA events")
async def list_events(limit: int = 500, db=Depends(get_db)) -> dict:
    cursor = await db.execute(
        "SELECT * FROM events ORDER BY ingested_at DESC LIMIT ?", (min(limit, 1000),)
    )
    rows = await cursor.fetchall()
    return _ok({"events": [dict(r) for r in rows], "count": len(rows)})


# ── Stripe ────────────────────────────────────────────────────────────────────

class CheckoutIn(BaseModel):
    email: str
    artifact_id: str | None = None


@router.post("/stripe/create-checkout-session", summary="Create a Stripe checkout session")
async def create_checkout_session(data: CheckoutIn) -> dict:
    if not settings.stripe_configured:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
            mode="payment",
            customer_email=data.email,
            metadata={"artifact_id": data.artifact_id or ""},
            success_url=f"{settings.APP_BASE_URL}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.APP_BASE_URL}/cancel",
        )
        return _ok({"url": session.url, "session_id": session.id})
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/stripe/webhook", summary="Stripe webhook receiver")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
    db=Depends(get_db),
) -> JSONResponse:
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET is not configured")
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    obj = event["data"]["object"]
    artifact_id = obj.get("metadata", {}).get("artifact_id", "")
    if artifact_id and event["type"] == "checkout.session.completed":
        import datetime as dt
        ts = dt.datetime.now(dt.timezone.utc).isoformat()
        await db.execute(
            "UPDATE artifacts SET status = ? WHERE artifact_id = ?",
            ("funded_pending_notary_or_public_release", artifact_id),
        )
        await db.execute(
            "INSERT INTO gateway_events VALUES(?,?,?,?,?)",
            ("evt_" + uuid.uuid4().hex[:12], artifact_id, event["type"], json.dumps(obj, default=str), ts),
        )
        await db.commit()
        await notification_service.notify_payment_completed(artifact_id, obj.get("id", ""))

    return JSONResponse(content={"received": True, "ok": True})

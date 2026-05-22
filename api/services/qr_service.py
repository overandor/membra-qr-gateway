"""QR artifact generation, hashing, and CRUD operations."""
from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

import aiosqlite
import structlog

from api.core.config import settings
from api.core.errors import NotFoundError
from api.db.repositories import qr_repository

log = structlog.get_logger(__name__)

# ── Pydantic schemas ──────────────────────────────────────────────────────────
from pydantic import BaseModel, Field


class ArtifactIn(BaseModel):
    owner_email: str = ""
    artifact_title: str = Field(..., min_length=1, max_length=255)
    artifact_type: str = "proofbook"
    destination_url: str = Field(..., min_length=1, max_length=2048)
    public_wallet: str = ""
    provenance_notes: str = ""
    consent_scope: str = "public hash, timestamp, QR redirect, consented metadata only"


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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_utc() -> str:
    import datetime as dt
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _compute_artifact_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


# ── Service functions ─────────────────────────────────────────────────────────

async def create_artifact(
    conn: aiosqlite.Connection, data: ArtifactIn
) -> dict[str, Any]:
    """Create and persist a new QR artifact."""
    artifact_id = "art_" + uuid.uuid4().hex[:12]
    qr_url = f"{settings.APP_BASE_URL}/g/{artifact_id}"
    wallet = data.public_wallet or settings.PUBLIC_SUPPORT_WALLET
    ts = _now_utc()

    public_payload: dict[str, Any] = {
        "artifact_id": artifact_id,
        "artifact_title": data.artifact_title,
        "artifact_type": data.artifact_type,
        "destination_url": data.destination_url,
        "public_wallet": wallet,
        "consent_scope": data.consent_scope,
        "provenance_notes": data.provenance_notes,
        "created_at": ts,
    }
    digest = _compute_artifact_hash(public_payload)

    manifest: dict[str, Any] = {
        **public_payload,
        "artifact_hash": digest,
        "qr_url": qr_url,
        "status": "registered_pending_external_verification",
        "safety": {
            "private_key_policy": (
                "private keys and seed phrases are never collected, stored, rendered, or requested"
            ),
            "onchain_policy": (
                "public ledger should store hashes, timestamps, and consented metadata only"
            ),
        },
    }

    db_row: dict[str, Any] = {
        "artifact_id": artifact_id,
        "owner_email": data.owner_email,
        "artifact_title": data.artifact_title,
        "artifact_type": data.artifact_type,
        "destination_url": data.destination_url,
        "public_wallet": wallet,
        "provenance_notes": data.provenance_notes,
        "consent_scope": data.consent_scope,
        "artifact_hash": digest,
        "qr_url": qr_url,
        "status": manifest["status"],
        "stripe_session_id": None,
        "created_at": ts,
    }

    await qr_repository.insert_artifact(conn, db_row)
    await qr_repository.insert_gateway_event(
        conn,
        event_id="evt_" + uuid.uuid4().hex[:12],
        artifact_id=artifact_id,
        event_type="artifact_registered",
        payload=manifest,
        created_at=ts,
    )

    log.info("artifact_created", artifact_id=artifact_id, type=data.artifact_type)
    return manifest


async def get_artifact(
    conn: aiosqlite.Connection, artifact_id: str
) -> dict[str, Any]:
    row = await qr_repository.get_artifact(conn, artifact_id)
    if not row:
        raise NotFoundError(f"Artifact {artifact_id!r} not found")
    return row


async def list_artifacts(
    conn: aiosqlite.Connection, limit: int = 200
) -> list[dict[str, Any]]:
    return await qr_repository.list_artifacts(conn, limit)


async def record_scan(
    conn: aiosqlite.Connection, artifact_id: str
) -> dict[str, Any]:
    """Record a gateway scan event and return the artifact."""
    row = await qr_repository.get_artifact(conn, artifact_id)
    if not row:
        raise NotFoundError(f"Artifact {artifact_id!r} not found")
    ts = _now_utc()
    await qr_repository.insert_gateway_event(
        conn,
        event_id="evt_" + uuid.uuid4().hex[:12],
        artifact_id=artifact_id,
        event_type="scan",
        payload={},
        created_at=ts,
    )
    log.info("artifact_scanned", artifact_id=artifact_id)
    return dict(row)


async def create_artifact_from_membra_event(
    conn: aiosqlite.Connection, event: MembraEventIn
) -> dict[str, Any] | None:
    """Auto-create an artifact when a qualifying MEMBRA event is ingested."""
    if event.event_type not in {"visibility_confirmed", "qr_artifact_created"}:
        return None
    payload = event.payload or {}
    title = (
        payload.get("artifact_title")
        or payload.get("title")
        or f"MEMBRA {event.subject_type} {event.subject_id}"
    )
    destination = (
        payload.get("destination_url")
        or payload.get("qr_url")
        or f"{settings.APP_BASE_URL}/g/{event.subject_id}"
    )
    return await create_artifact(
        conn,
        ArtifactIn(
            owner_email=payload.get("owner_email", ""),
            artifact_title=title,
            artifact_type=event.subject_type,
            destination_url=destination,
            public_wallet=payload.get("public_wallet", ""),
            provenance_notes=f"Created from MEMBRA event {event.event_id} ({event.event_type})",
            consent_scope=event.consent_scope
            or "canonical MEMBRA event envelope and QR provenance metadata only",
        ),
    )

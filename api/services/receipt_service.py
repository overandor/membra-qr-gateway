"""Receipt creation, retrieval, and proof verification."""
from __future__ import annotations

import datetime as dt
import hashlib
import uuid
from typing import Any

import aiosqlite
import structlog
from pydantic import BaseModel, Field

from api.core.errors import NotFoundError
from api.db.repositories import receipt_repository, qr_repository

log = structlog.get_logger(__name__)


class ReceiptIn(BaseModel):
    artifact_id: str = Field(..., min_length=1)
    scan_ip: str = ""           # hashed before storage
    user_agent: str = ""        # hashed before storage
    proof_hash: str = ""        # optional external proof hash


class ReceiptOut(BaseModel):
    id: str
    artifact_id: str
    scan_ip_hash: str
    user_agent_hash: str
    proof_hash: str
    created_at: str
    verified: bool


def _sha256_hex(value: str) -> str:
    if not value:
        return ""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _compute_proof_hash(receipt_id: str, artifact_id: str, created_at: str) -> str:
    raw = f"{receipt_id}:{artifact_id}:{created_at}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def create_receipt(
    conn: aiosqlite.Connection, data: ReceiptIn
) -> dict[str, Any]:
    """Create a scan receipt for an artifact."""
    # Verify the artifact exists
    artifact = await qr_repository.get_artifact(conn, data.artifact_id)
    if not artifact:
        raise NotFoundError(f"Artifact {data.artifact_id!r} not found")

    receipt_id = "rcpt_" + uuid.uuid4().hex[:12]
    ts = dt.datetime.now(dt.timezone.utc).isoformat()
    proof = data.proof_hash or _compute_proof_hash(receipt_id, data.artifact_id, ts)

    row: dict[str, Any] = {
        "id": receipt_id,
        "artifact_id": data.artifact_id,
        "scan_ip_hash": _sha256_hex(data.scan_ip),
        "user_agent_hash": _sha256_hex(data.user_agent),
        "proof_hash": proof,
        "created_at": ts,
        "verified": False,
    }

    await receipt_repository.insert_receipt(conn, row)
    log.info("receipt_created", receipt_id=receipt_id, artifact_id=data.artifact_id)
    return row


async def get_receipt(conn: aiosqlite.Connection, receipt_id: str) -> dict[str, Any]:
    row = await receipt_repository.get_receipt(conn, receipt_id)
    if not row:
        raise NotFoundError(f"Receipt {receipt_id!r} not found")
    return row


async def list_receipts(
    conn: aiosqlite.Connection, artifact_id: str, limit: int = 100
) -> list[dict[str, Any]]:
    return await receipt_repository.list_receipts_for_artifact(conn, artifact_id, limit)


async def verify_receipt(conn: aiosqlite.Connection, receipt_id: str) -> dict[str, Any]:
    """Mark a receipt as verified and return updated record."""
    row = await receipt_repository.get_receipt(conn, receipt_id)
    if not row:
        raise NotFoundError(f"Receipt {receipt_id!r} not found")
    await receipt_repository.mark_receipt_verified(conn, receipt_id)
    row["verified"] = 1
    log.info("receipt_verified", receipt_id=receipt_id)
    return row

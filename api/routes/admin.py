"""Admin routes — require admin API key.

POST /api/admin/rotate-key — rotate a named API key
GET  /api/admin/stats      — system statistics
"""
from __future__ import annotations

import datetime as dt
from typing import Any

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.db.session import get_db
from api.security.auth import AuthenticatedUser, require_admin
from api.security.api_keys import derive_key_id, generate_api_key, hash_api_key
from api.observability.metrics import ADMIN_OPERATIONS

router = APIRouter()
log = structlog.get_logger(__name__)


def _ok(data: Any) -> dict:
    return {"ok": True, "data": data}


class RotateKeyIn(BaseModel):
    key_name: str = "default"


@router.post(
    "/admin/rotate-key",
    summary="Rotate an API key (admin only)",
    dependencies=[Depends(require_admin)],
)
async def rotate_key(data: RotateKeyIn, user: AuthenticatedUser = Depends(require_admin)) -> dict:
    """Generate a new API key and return its hash for storage."""
    new_key = generate_api_key()
    key_hash = hash_api_key(new_key)
    key_id = derive_key_id(new_key)

    log.warning(
        "admin_key_rotated",
        key_name=data.key_name,
        key_id=key_id,
        actor=user.subject,
    )
    ADMIN_OPERATIONS.labels(operation="rotate_key").inc()

    return _ok({
        "key_name": data.key_name,
        "key_id": key_id,
        "raw_key": new_key,  # shown once — store immediately
        "key_hash": key_hash,
        "rotated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "warning": "Store the raw_key immediately — it will not be shown again.",
    })


@router.get(
    "/admin/stats",
    summary="System statistics (admin only)",
    dependencies=[Depends(require_admin)],
)
async def system_stats(user: AuthenticatedUser = Depends(require_admin), db=Depends(get_db)) -> dict:
    """Return aggregate counts and configuration status."""
    from api.core.config import settings
    from api.db.repositories.qr_repository import count_artifacts
    from api.db.repositories.audit_repository import count_audit_events

    artifact_count = await count_artifacts(db)
    audit_count = await count_audit_events(db)

    ADMIN_OPERATIONS.labels(operation="stats").inc()
    log.info("admin_stats_queried", actor=user.subject)

    return _ok({
        "artifact_count": artifact_count,
        "audit_event_count": audit_count,
        "stripe_configured": settings.stripe_configured,
        "jwt_configured": settings.jwt_configured,
        "membra_event_secret_configured": settings.membra_event_secret_configured,
        "solana_rpc_url": settings.SOLANA_RPC_URL,
        "queried_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    })

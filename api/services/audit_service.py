"""Audit event write/query operations."""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any, Literal

import aiosqlite
import structlog
from pydantic import BaseModel, Field

from api.db.repositories import audit_repository

log = structlog.get_logger(__name__)

Severity = Literal["debug", "info", "warning", "error", "critical"]


class AuditEventIn(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    actor: str = "system"
    resource_type: str = ""
    resource_id: str = ""
    details: dict[str, Any] = Field(default_factory=dict)
    severity: Severity = "info"


async def record_event(
    conn: aiosqlite.Connection,
    event_type: str,
    actor: str = "system",
    resource_type: str = "",
    resource_id: str = "",
    details: dict[str, Any] | None = None,
    severity: Severity = "info",
) -> dict[str, Any]:
    """Write a single audit event and return the stored record."""
    event_id = "aud_" + uuid.uuid4().hex[:12]
    ts = dt.datetime.now(dt.timezone.utc).isoformat()

    row: dict[str, Any] = {
        "id": event_id,
        "event_id": event_id,
        "event_type": event_type,
        "actor": actor,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
        "severity": severity,
        "created_at": ts,
    }

    await audit_repository.insert_audit_event(conn, row)
    log.info(
        "audit_event_recorded",
        event_type=event_type,
        actor=actor,
        severity=severity,
        resource_id=resource_id or None,
    )
    return row


async def list_events(
    conn: aiosqlite.Connection,
    event_type: str | None = None,
    actor: str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    return await audit_repository.list_audit_events(conn, event_type=event_type, actor=actor, limit=limit)


async def record_from_schema(
    conn: aiosqlite.Connection, data: AuditEventIn
) -> dict[str, Any]:
    return await record_event(
        conn,
        event_type=data.event_type,
        actor=data.actor,
        resource_type=data.resource_type,
        resource_id=data.resource_id,
        details=data.details,
        severity=data.severity,
    )

"""Audit log routes.

GET  /api/audit          — list audit events (optionally filtered)
POST /api/audit/event    — record a manual audit event
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from api.db.session import get_db
from api.services.audit_service import AuditEventIn, list_events, record_from_schema

router = APIRouter()


def _ok(data: object) -> dict:
    return {"ok": True, "data": data}


@router.get("/audit", summary="List audit events")
async def list_audit_events(
    event_type: str | None = None,
    actor: str | None = None,
    limit: int = 200,
    db=Depends(get_db),
) -> dict:
    rows = await list_events(db, event_type=event_type, actor=actor, limit=min(limit, 1000))
    return _ok({"events": rows, "count": len(rows)})


@router.post("/audit/event", summary="Record a manual audit event")
async def post_audit_event(data: AuditEventIn, db=Depends(get_db)) -> dict:
    row = await record_from_schema(db, data)
    return _ok(row)

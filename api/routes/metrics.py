"""Telemetry ingest route and Prometheus exposition endpoint.

POST /api/metrics/event  — ingest a client-side telemetry event
GET  /api/metrics        — Prometheus text exposition (scrape target)
"""
from __future__ import annotations

import datetime as dt
from typing import Any

import structlog
from fastapi import APIRouter, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from api.observability.metrics import CLIENT_EVENTS_INGESTED

router = APIRouter()
log = structlog.get_logger(__name__)


class TelemetryEventIn(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=100)
    source: str = "client"
    properties: dict[str, Any] = Field(default_factory=dict)
    session_id: str = ""
    occurred_at: str = ""


def _ok(data: Any) -> dict:
    return {"ok": True, "data": data}


@router.post("/metrics/event", summary="Ingest a client-side telemetry event")
async def ingest_telemetry_event(data: TelemetryEventIn) -> dict:
    """Accept a structured telemetry event from a client and log it."""
    ts = data.occurred_at or dt.datetime.now(dt.timezone.utc).isoformat()
    log.info(
        "telemetry_event",
        event_name=data.event_name,
        source=data.source,
        session_id=data.session_id or None,
        occurred_at=ts,
    )
    CLIENT_EVENTS_INGESTED.labels(event_name=data.event_name).inc()
    return _ok({
        "event_name": data.event_name,
        "accepted": True,
        "occurred_at": ts,
    })


@router.get("/metrics", summary="Prometheus metrics exposition", include_in_schema=False)
async def prometheus_metrics() -> Response:
    """Expose all registered Prometheus metrics in text exposition format."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

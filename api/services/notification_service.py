"""Webhook and email notification stubs.

Outbound notifications are sent asynchronously.  If the external endpoint is
unreachable, the failure is logged but never raises to the caller — notifications
are best-effort.
"""
from __future__ import annotations

import json
from typing import Any

import httpx
import structlog

from api.core.config import settings
from api.security.request_signing import signed_headers

log = structlog.get_logger(__name__)


async def send_webhook(event_type: str, payload: dict[str, Any]) -> bool:
    """POST *payload* to the configured webhook URL, signed with HMAC-SHA256.

    Returns True if delivery succeeded (2xx), False otherwise.
    """
    url = settings.WEBHOOK_NOTIFICATION_URL
    secret = settings.WEBHOOK_SIGNING_SECRET
    if not url:
        log.debug("webhook_skipped_no_url", event_type=event_type)
        return False

    body = json.dumps({"event_type": event_type, "payload": payload}, default=str).encode("utf-8")
    headers = signed_headers(body, secret) if secret else {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(url, content=body, headers=headers)
            resp.raise_for_status()
            log.info("webhook_delivered", event_type=event_type, status=resp.status_code)
            return True
        except httpx.RequestError as exc:
            log.warning("webhook_delivery_failed", event_type=event_type, error=str(exc))
            return False
        except httpx.HTTPStatusError as exc:
            log.warning(
                "webhook_delivery_error",
                event_type=event_type,
                status=exc.response.status_code,
            )
            return False


async def notify_artifact_created(artifact: dict[str, Any]) -> None:
    """Fire-and-forget notification when an artifact is created."""
    await send_webhook("artifact.created", {"artifact_id": artifact.get("artifact_id"), "type": artifact.get("artifact_type")})


async def notify_scan(artifact_id: str) -> None:
    """Fire-and-forget notification when an artifact is scanned."""
    await send_webhook("artifact.scanned", {"artifact_id": artifact_id})


async def notify_payment_completed(artifact_id: str, session_id: str) -> None:
    """Fire-and-forget notification when a Stripe payment completes."""
    await send_webhook(
        "payment.completed",
        {"artifact_id": artifact_id, "stripe_session_id": session_id},
    )

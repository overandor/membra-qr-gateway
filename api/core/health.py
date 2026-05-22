"""Health check business logic — separate from the HTTP route."""
from __future__ import annotations

import aiosqlite
import structlog

from api.core.config import settings
from api.db.session import get_db_path

log = structlog.get_logger(__name__)


async def liveness() -> dict[str, object]:
    """Simple liveness probe — returns immediately if the process is alive."""
    return {
        "ok": True,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "stripe_configured": settings.stripe_configured,
        "jwt_configured": settings.jwt_configured,
    }


async def readiness() -> dict[str, object]:
    """Readiness probe — checks DB connectivity and emits configuration warnings."""
    warnings: list[str] = []
    db_ok = False

    if not settings.membra_event_secret_configured:
        warnings.append("MEMBRA_EVENT_SECRET not set — event signature verification is permissive")
    if not settings.jwt_configured:
        warnings.append("JWT_SECRET not set — JWT auth is disabled")
    if not settings.ADMIN_API_KEY:
        warnings.append("ADMIN_API_KEY not set — admin endpoints are open")

    artifact_count = 0
    event_count = 0

    try:
        async with aiosqlite.connect(get_db_path()) as conn:
            conn.row_factory = aiosqlite.Row
            row = await (await conn.execute("SELECT COUNT(*) FROM artifacts")).fetchone()
            artifact_count = row[0] if row else 0
            row = await (await conn.execute("SELECT COUNT(*) FROM events")).fetchone()
            event_count = row[0] if row else 0
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        log.error("readiness_db_check_failed", error=str(exc))
        warnings.append(f"Database check failed: {exc}")

    return {
        "ok": db_ok,
        "warnings": warnings,
        "artifact_count": artifact_count,
        "event_count": event_count,
    }

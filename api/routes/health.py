"""Health and readiness endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from api.core.health import liveness, readiness

router = APIRouter()


@router.get("/health", summary="Liveness probe")
async def health() -> dict:
    """Returns 200 immediately if the process is alive."""
    return await liveness()


@router.get("/ready", summary="Readiness probe")
async def ready() -> dict:
    """Checks DB connectivity and configuration completeness."""
    result = await readiness()
    return result

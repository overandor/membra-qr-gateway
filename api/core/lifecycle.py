"""Application lifespan — startup and shutdown logic."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog

from api.core.config import settings
from api.core.logging import configure_logging
from api.db.session import close_db, init_db

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: object) -> AsyncGenerator[None, None]:  # type: ignore[type-arg]
    """FastAPI lifespan context manager.

    Everything before ``yield`` runs on startup;
    everything after runs on shutdown.
    """
    configure_logging()
    log.info(
        "startup",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        db=str(settings.DB_PATH),
        stripe_configured=settings.stripe_configured,
        jwt_configured=settings.jwt_configured,
    )

    await init_db()
    log.info("database_ready", path=str(settings.DB_PATH))

    yield

    await close_db()
    log.info("shutdown", app=settings.APP_NAME)

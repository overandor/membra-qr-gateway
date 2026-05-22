"""FastAPI application factory.

Import ``create_app`` to get the configured FastAPI instance.
All middleware, routers, and exception handlers are registered here.
"""
from __future__ import annotations

import stripe
from fastapi import FastAPI

from api.core.config import settings
from api.core.errors import register_exception_handlers
from api.core.lifecycle import lifespan
from api.routes import admin, audit, health, metrics, protocol, qr, receipts, wallet
from api.security.middleware import register_middleware


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""
    # Configure stripe globally
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "MEMBRA QR Gateway — proof, wallet, artifact, and scan gateway. "
            "Registers public QR/NFC artifacts, ingests canonical MEMBRA events, "
            "records scan/proof events, and exposes Stripe hooks."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware (order matters — outermost registered last) ────────────────
    register_middleware(app)

    # ── Exception handlers ────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(health.router, tags=["health"])
    app.include_router(qr.router, prefix="/api", tags=["qr"])
    app.include_router(receipts.router, prefix="/api", tags=["receipts"])
    app.include_router(protocol.router, prefix="/api", tags=["protocol"])
    app.include_router(wallet.router, prefix="/api", tags=["wallet"])
    app.include_router(audit.router, prefix="/api", tags=["audit"])
    app.include_router(admin.router, prefix="/api", tags=["admin"])
    app.include_router(metrics.router, prefix="/api", tags=["metrics"])

    return app


# Module-level instance used by uvicorn
app = create_app()

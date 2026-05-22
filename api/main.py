"""Uvicorn entrypoint.

Run with:
    python -m api.main
    uvicorn api.main:app --reload
"""
from __future__ import annotations

import uvicorn

from api.app import app  # noqa: F401 — re-exported for uvicorn string form
from api.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=False,
        log_config=None,  # structlog handles all logging
        access_log=False,
    )

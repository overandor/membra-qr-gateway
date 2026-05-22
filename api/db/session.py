"""Async SQLite session factory using aiosqlite."""
from __future__ import annotations

import os
from pathlib import Path
from typing import AsyncGenerator

import aiosqlite
import structlog

log = structlog.get_logger(__name__)

# Module-level path — resolved once so tests can override via env var
_DB_PATH: Path | None = None


def get_db_path() -> str:
    """Return the database file path as a string."""
    global _DB_PATH
    if _DB_PATH is None:
        # Import here to avoid circular import at module init time
        from api.core.config import settings
        _DB_PATH = settings.DB_PATH
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return str(_DB_PATH)


def override_db_path(path: str | Path) -> None:
    """Override the database path — used by tests."""
    global _DB_PATH
    _DB_PATH = Path(path)
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """FastAPI dependency — yields an aiosqlite connection with row_factory set."""
    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")
        yield conn


async def init_db() -> None:
    """Run all migrations in order at startup."""
    from api.db.migrations import run_migrations
    await run_migrations(get_db_path())


async def close_db() -> None:
    """Placeholder — aiosqlite connections are context-managed per request."""
    log.debug("db_close_noop")

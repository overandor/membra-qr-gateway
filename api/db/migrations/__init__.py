"""Database migration runner.

Migrations are plain SQL files named ``NNNN_description.sql`` in this package
directory.  They are executed in lexicographic order.  A ``schema_migrations``
table tracks which have already been applied so re-running is idempotent.
"""
from __future__ import annotations

import os
from pathlib import Path

import aiosqlite
import structlog

log = structlog.get_logger(__name__)

_MIGRATIONS_DIR = Path(__file__).parent


async def run_migrations(db_path: str) -> None:
    """Apply all pending SQL migrations to the database at *db_path*."""
    async with aiosqlite.connect(db_path) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")

        # Bootstrap the migrations tracking table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
        """)
        await conn.commit()

        applied = {
            row[0]
            async for row in await conn.execute("SELECT version FROM schema_migrations")
        }

        migration_files = sorted(
            f for f in _MIGRATIONS_DIR.glob("*.sql")
        )

        for mf in migration_files:
            version = mf.stem  # e.g. "0001_init"
            if version in applied:
                log.debug("migration_skipped", version=version)
                continue

            sql = mf.read_text(encoding="utf-8")
            log.info("migration_applying", version=version)
            await conn.executescript(sql)

            import datetime as dt
            await conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (version, dt.datetime.now(dt.timezone.utc).isoformat()),
            )
            await conn.commit()
            log.info("migration_applied", version=version)

"""Data-access layer for the artifacts table."""
from __future__ import annotations

import json
from typing import Any

import aiosqlite
import structlog

log = structlog.get_logger(__name__)


async def insert_artifact(conn: aiosqlite.Connection, row: dict[str, Any]) -> None:
    await conn.execute(
        """
        INSERT INTO artifacts
            (artifact_id, owner_email, artifact_title, artifact_type,
             destination_url, public_wallet, provenance_notes, consent_scope,
             artifact_hash, qr_url, status, stripe_session_id, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            row["artifact_id"],
            row.get("owner_email", ""),
            row["artifact_title"],
            row.get("artifact_type", "proofbook"),
            row["destination_url"],
            row.get("public_wallet", ""),
            row.get("provenance_notes", ""),
            row.get("consent_scope", ""),
            row["artifact_hash"],
            row["qr_url"],
            row.get("status", "registered_pending_external_verification"),
            row.get("stripe_session_id"),
            row["created_at"],
        ),
    )
    await conn.commit()


async def insert_gateway_event(
    conn: aiosqlite.Connection,
    event_id: str,
    artifact_id: str,
    event_type: str,
    payload: dict[str, Any],
    created_at: str,
) -> None:
    await conn.execute(
        "INSERT INTO gateway_events (event_id, artifact_id, event_type, payload_json, created_at) "
        "VALUES (?,?,?,?,?)",
        (event_id, artifact_id, event_type, json.dumps(payload, default=str), created_at),
    )
    await conn.commit()


async def get_artifact(conn: aiosqlite.Connection, artifact_id: str) -> dict[str, Any] | None:
    row = await (
        await conn.execute(
            "SELECT * FROM artifacts WHERE artifact_id = ?",
            (artifact_id,),
        )
    ).fetchone()
    return dict(row) if row else None


async def list_artifacts(
    conn: aiosqlite.Connection, limit: int = 200
) -> list[dict[str, Any]]:
    cursor = await conn.execute(
        "SELECT artifact_id, artifact_title, artifact_type, artifact_hash, "
        "qr_url, status, created_at FROM artifacts ORDER BY created_at DESC LIMIT ?",
        (limit,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def update_artifact_status(
    conn: aiosqlite.Connection, artifact_id: str, status: str
) -> None:
    await conn.execute(
        "UPDATE artifacts SET status = ? WHERE artifact_id = ?",
        (status, artifact_id),
    )
    await conn.commit()


async def count_artifacts(conn: aiosqlite.Connection) -> int:
    row = await (await conn.execute("SELECT COUNT(*) FROM artifacts")).fetchone()
    return row[0] if row else 0

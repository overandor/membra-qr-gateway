"""Data-access layer for the audit_log table."""
from __future__ import annotations

import json
from typing import Any

import aiosqlite


async def insert_audit_event(conn: aiosqlite.Connection, row: dict[str, Any]) -> None:
    await conn.execute(
        """
        INSERT INTO audit_log
            (id, event_id, event_type, actor, resource_type,
             resource_id, details_json, severity, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["event_id"],
            row["event_type"],
            row.get("actor", "system"),
            row.get("resource_type", ""),
            row.get("resource_id", ""),
            json.dumps(row.get("details", {}), default=str),
            row.get("severity", "info"),
            row["created_at"],
        ),
    )
    await conn.commit()


async def list_audit_events(
    conn: aiosqlite.Connection,
    event_type: str | None = None,
    actor: str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    conditions: list[str] = []
    params: list[Any] = []

    if event_type:
        conditions.append("event_type = ?")
        params.append(event_type)
    if actor:
        conditions.append("actor = ?")
        params.append(actor)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    params.append(limit)

    cursor = await conn.execute(
        f"SELECT * FROM audit_log {where} ORDER BY created_at DESC LIMIT ?",  # noqa: S608
        params,
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def count_audit_events(conn: aiosqlite.Connection) -> int:
    row = await (await conn.execute("SELECT COUNT(*) FROM audit_log")).fetchone()
    return row[0] if row else 0

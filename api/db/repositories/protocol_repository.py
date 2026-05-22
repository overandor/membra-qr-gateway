"""Data-access layer for the protocol_snapshots table."""
from __future__ import annotations

import json
from typing import Any

import aiosqlite


async def insert_snapshot(conn: aiosqlite.Connection, row: dict[str, Any]) -> None:
    await conn.execute(
        """
        INSERT INTO protocol_snapshots (id, program, state_json, slot, created_at)
        VALUES (?,?,?,?,?)
        """,
        (
            row["id"],
            row["program"],
            json.dumps(row.get("state", {}), default=str),
            row.get("slot", 0),
            row["created_at"],
        ),
    )
    await conn.commit()


async def get_latest_snapshot(
    conn: aiosqlite.Connection, program: str
) -> dict[str, Any] | None:
    row = await (
        await conn.execute(
            "SELECT * FROM protocol_snapshots WHERE program = ? ORDER BY slot DESC LIMIT 1",
            (program,),
        )
    ).fetchone()
    return dict(row) if row else None


async def list_snapshots(
    conn: aiosqlite.Connection, program: str, limit: int = 50
) -> list[dict[str, Any]]:
    cursor = await conn.execute(
        "SELECT * FROM protocol_snapshots WHERE program = ? ORDER BY slot DESC LIMIT ?",
        (program, limit),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

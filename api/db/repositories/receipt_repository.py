"""Data-access layer for the receipts table."""
from __future__ import annotations

from typing import Any

import aiosqlite


async def insert_receipt(conn: aiosqlite.Connection, row: dict[str, Any]) -> None:
    await conn.execute(
        """
        INSERT INTO receipts
            (id, artifact_id, scan_ip_hash, user_agent_hash, proof_hash, created_at, verified)
        VALUES (?,?,?,?,?,?,?)
        """,
        (
            row["id"],
            row["artifact_id"],
            row.get("scan_ip_hash", ""),
            row.get("user_agent_hash", ""),
            row["proof_hash"],
            row["created_at"],
            int(row.get("verified", False)),
        ),
    )
    await conn.commit()


async def get_receipt(conn: aiosqlite.Connection, receipt_id: str) -> dict[str, Any] | None:
    row = await (
        await conn.execute("SELECT * FROM receipts WHERE id = ?", (receipt_id,))
    ).fetchone()
    return dict(row) if row else None


async def list_receipts_for_artifact(
    conn: aiosqlite.Connection, artifact_id: str, limit: int = 100
) -> list[dict[str, Any]]:
    cursor = await conn.execute(
        "SELECT * FROM receipts WHERE artifact_id = ? ORDER BY created_at DESC LIMIT ?",
        (artifact_id, limit),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def mark_receipt_verified(conn: aiosqlite.Connection, receipt_id: str) -> None:
    await conn.execute(
        "UPDATE receipts SET verified = 1 WHERE id = ?",
        (receipt_id,),
    )
    await conn.commit()

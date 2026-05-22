"""Protocol state queries — reads Solana RPC for MEMBRA program accounts.

The IDO, rebase, rewards, governance, and attestation state are fetched from
on-chain program accounts.  When the RPC is unavailable a graceful stub
response is returned so the API remains available in test/dev environments.
"""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

import aiosqlite
import structlog

from api.db.repositories import protocol_repository
from api.services.chain_client import SolanaRPCError, get_account_info, get_slot

log = structlog.get_logger(__name__)

# ── Known MEMBRA program IDs (placeholder addresses) ─────────────────────────
PROGRAM_IDS: dict[str, str] = {
    "ido": "MEMBRAidoProgramAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "rebase": "MEMBRArebaseProgramAAAAAAAAAAAAAAAAAAAAAAAAA",
    "rewards": "MEMBrewardsProgramAAAAAAAAAAAAAAAAAAAAAAAAA",
    "governance": "MEMBRAgoverncProgramAAAAAAAAAAAAAAAAAAAAAAAA",
    "attestation": "MEMBRAattestProgramAAAAAAAAAAAAAAAAAAAAAAAAA",
}


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


async def get_program_state(
    conn: aiosqlite.Connection, program: str
) -> dict[str, Any]:
    """Return the latest known state for *program*, refreshing from RPC if possible."""
    program_id = PROGRAM_IDS.get(program)
    if not program_id:
        from api.core.errors import NotFoundError
        raise NotFoundError(f"Unknown protocol program: {program!r}")

    slot = 0
    rpc_state: dict[str, Any] = {}
    rpc_ok = False

    try:
        slot = await get_slot()
        account = await get_account_info(program_id)
        rpc_state = {
            "program_id": program_id,
            "slot": slot,
            "account": account,
            "fetched_at": _now(),
        }
        rpc_ok = True
    except SolanaRPCError as exc:
        log.warning("solana_rpc_unavailable", program=program, error=str(exc))
        rpc_state = {
            "program_id": program_id,
            "slot": 0,
            "account": None,
            "note": "Solana RPC unavailable — serving cached or stub data",
        }

    if rpc_ok:
        await protocol_repository.insert_snapshot(conn, {
            "id": "snap_" + uuid.uuid4().hex[:12],
            "program": program,
            "state": rpc_state,
            "slot": slot,
            "created_at": _now(),
        })

    # Always return the freshest available data
    latest = await protocol_repository.get_latest_snapshot(conn, program)
    if latest:
        import json
        state = json.loads(latest["state_json"])
        return {
            "ok": True,
            "data": {
                "program": program,
                "program_id": program_id,
                "state": state,
                "slot": latest["slot"],
                "snapshot_id": latest["id"],
                "snapshot_at": latest["created_at"],
            },
        }

    # No cached snapshot — return the stub
    return {
        "ok": True,
        "data": {
            "program": program,
            "program_id": program_id,
            "state": rpc_state,
            "slot": slot,
            "note": "No cached snapshot available",
        },
    }


async def get_ido_state(conn: aiosqlite.Connection) -> dict[str, Any]:
    return await get_program_state(conn, "ido")


async def get_rebase_state(conn: aiosqlite.Connection) -> dict[str, Any]:
    return await get_program_state(conn, "rebase")


async def get_rewards_state(conn: aiosqlite.Connection) -> dict[str, Any]:
    return await get_program_state(conn, "rewards")


async def get_governance_state(conn: aiosqlite.Connection) -> dict[str, Any]:
    return await get_program_state(conn, "governance")


async def get_attestation_state(conn: aiosqlite.Connection) -> dict[str, Any]:
    return await get_program_state(conn, "attestation")

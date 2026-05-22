"""Solana JSON-RPC client — raw HTTP, no external SDK.

All Solana RPC calls use the standard JSON-RPC 2.0 protocol over HTTPS.
Reference: https://docs.solana.com/api/http
"""
from __future__ import annotations

import json
from typing import Any

import httpx
import structlog

from api.core.config import settings

log = structlog.get_logger(__name__)


class SolanaRPCError(Exception):
    """Raised when the Solana RPC returns an error response."""


async def _rpc(method: str, params: list[Any]) -> Any:
    """Make a JSON-RPC call and return the ``result`` field."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    }
    async with httpx.AsyncClient(timeout=settings.SOLANA_RPC_TIMEOUT_S) as client:
        try:
            resp = await client.post(
                settings.SOLANA_RPC_URL,
                content=json.dumps(payload),
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
        except httpx.RequestError as exc:
            raise SolanaRPCError(f"RPC transport error: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            raise SolanaRPCError(f"RPC HTTP {exc.response.status_code}") from exc

    data = resp.json()
    if "error" in data:
        err = data["error"]
        raise SolanaRPCError(f"RPC error {err.get('code')}: {err.get('message')}")
    return data.get("result")


async def get_account_info(address: str, encoding: str = "base64") -> dict[str, Any] | None:
    """Fetch raw account info for *address*.

    Returns None if the account does not exist.
    """
    result = await _rpc(
        "getAccountInfo",
        [address, {"encoding": encoding, "commitment": "finalized"}],
    )
    log.debug("solana_get_account_info", address=address, found=result is not None)
    return result  # type: ignore[return-value]


async def get_slot() -> int:
    """Return the current slot number."""
    result = await _rpc("getSlot", [{"commitment": "finalized"}])
    return int(result)


async def get_balance(address: str) -> int:
    """Return the SOL balance of *address* in lamports."""
    result = await _rpc("getBalance", [address, {"commitment": "finalized"}])
    return int(result.get("value", 0))


async def get_transaction(signature: str) -> dict[str, Any] | None:
    """Fetch a confirmed transaction by its base58 signature."""
    result = await _rpc(
        "getTransaction",
        [signature, {"encoding": "json", "commitment": "finalized", "maxSupportedTransactionVersion": 0}],
    )
    return result  # type: ignore[return-value]


async def get_program_accounts(
    program_id: str, filters: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """Fetch all accounts owned by *program_id*."""
    params: list[Any] = [program_id, {"encoding": "base64", "commitment": "finalized"}]
    if filters:
        params[1]["filters"] = filters
    result = await _rpc("getProgramAccounts", params)
    return result or []  # type: ignore[return-value]

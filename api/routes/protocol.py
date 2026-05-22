"""Protocol state routes — read Solana program state.

GET /api/protocol/ido
GET /api/protocol/rebase
GET /api/protocol/rewards
GET /api/protocol/governance
GET /api/protocol/attestation
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from api.db.session import get_db
from api.services.protocol_service import (
    get_attestation_state,
    get_governance_state,
    get_ido_state,
    get_rebase_state,
    get_rewards_state,
)
from api.observability.metrics import PROTOCOL_QUERIES

router = APIRouter()


@router.get("/protocol/ido", summary="IDO program state")
async def protocol_ido(db=Depends(get_db)) -> dict:
    PROTOCOL_QUERIES.labels(program="ido").inc()
    return await get_ido_state(db)


@router.get("/protocol/rebase", summary="Rebase program state")
async def protocol_rebase(db=Depends(get_db)) -> dict:
    PROTOCOL_QUERIES.labels(program="rebase").inc()
    return await get_rebase_state(db)


@router.get("/protocol/rewards", summary="Rewards program state")
async def protocol_rewards(db=Depends(get_db)) -> dict:
    PROTOCOL_QUERIES.labels(program="rewards").inc()
    return await get_rewards_state(db)


@router.get("/protocol/governance", summary="Governance program state")
async def protocol_governance(db=Depends(get_db)) -> dict:
    PROTOCOL_QUERIES.labels(program="governance").inc()
    return await get_governance_state(db)


@router.get("/protocol/attestation", summary="Attestation program state")
async def protocol_attestation(db=Depends(get_db)) -> dict:
    PROTOCOL_QUERIES.labels(program="attestation").inc()
    return await get_attestation_state(db)

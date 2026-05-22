"""Wallet authentication routes.

POST /api/wallet/challenge — issue a challenge nonce for a wallet
POST /api/wallet/verify   — verify signed nonce and return JWT
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from api.security import jwt as jwt_mod
from api.security.rate_limit import auth_rate_limit
from api.services.wallet_service import issue_challenge, verify_challenge
from api.observability.metrics import AUTH_ATTEMPTS, AUTH_FAILURES

router = APIRouter()


class ChallengeIn(BaseModel):
    wallet: str = Field(..., min_length=32, max_length=44, description="Base58 Solana wallet address")


class VerifyIn(BaseModel):
    wallet: str = Field(..., min_length=32, max_length=44)
    nonce: str = Field(..., min_length=1)
    signature: str = Field(..., min_length=1, description="Base64-encoded ed25519 signature of the nonce")


def _ok(data: object) -> dict:
    return {"ok": True, "data": data}


@router.post(
    "/wallet/challenge",
    summary="Issue a wallet authentication challenge",
    dependencies=[Depends(auth_rate_limit)],
)
async def wallet_challenge(data: ChallengeIn) -> dict:
    """Generate a one-time nonce for the given wallet address.

    The client must sign this nonce with the wallet's private key and submit
    the signature to POST /api/wallet/verify.  Private keys are never sent here.
    """
    challenge = issue_challenge(data.wallet)
    return _ok(challenge)


@router.post(
    "/wallet/verify",
    summary="Verify signed wallet challenge and receive JWT",
    dependencies=[Depends(auth_rate_limit)],
)
async def wallet_verify(data: VerifyIn) -> dict:
    """Verify the signed nonce and issue a JWT for the authenticated wallet."""
    AUTH_ATTEMPTS.inc()
    try:
        verified_wallet = verify_challenge(data.wallet, data.nonce, data.signature)
        token = jwt_mod.issue_token(subject=verified_wallet, extra_claims={"type": "wallet"})
        return _ok({
            "token": token,
            "wallet": verified_wallet,
            "token_type": "bearer",
        })
    except Exception as exc:
        AUTH_FAILURES.inc()
        raise

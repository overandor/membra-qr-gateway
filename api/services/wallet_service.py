"""Solana wallet challenge/response authentication.

Flow:
  1. Client calls POST /wallet/challenge with { wallet: "<base58>" }
     → Server stores a nonce and returns it.
  2. Client signs the nonce with its private key (off-server).
  3. Client calls POST /wallet/verify with { wallet, nonce, signature }
     → Server verifies the ed25519 signature and issues a JWT.

No private keys or seed phrases are ever accepted by this server.
"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import secrets
import structlog
from typing import Any

from api.core.errors import AuthError, GatewayError

log = structlog.get_logger(__name__)

# ── In-memory nonce store ──────────────────────────────────────────────────────
# { nonce: (wallet_address, expires_at) }
# In production, back this with Redis with TTL.
_NONCE_TTL_SECONDS = 300  # 5 minutes

_pending_challenges: dict[str, tuple[str, dt.datetime]] = {}


def issue_challenge(wallet: str) -> dict[str, Any]:
    """Generate a one-time nonce for *wallet* and return it."""
    # Expire old nonces lazily
    _purge_expired()

    nonce = secrets.token_urlsafe(32)
    expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=_NONCE_TTL_SECONDS)
    _pending_challenges[nonce] = (wallet, expires_at)

    log.info("wallet_challenge_issued", wallet=wallet[:8] + "...")
    return {
        "nonce": nonce,
        "wallet": wallet,
        "expires_at": expires_at.isoformat(),
        "instructions": (
            "Sign the nonce string with your wallet's private key using ed25519. "
            "Submit the base58-encoded signature to POST /api/wallet/verify. "
            "Private keys are never sent to this server."
        ),
    }


def verify_challenge(wallet: str, nonce: str, signature_b64: str) -> str:
    """Verify the signed nonce and return the wallet address on success.

    The signature must be a base64-encoded ed25519 signature of the raw nonce
    bytes, produced by the wallet's private key corresponding to *wallet*.

    Returns the verified wallet address (to be embedded in a JWT).
    Raises AuthError on any verification failure.
    """
    _purge_expired()

    entry = _pending_challenges.get(nonce)
    if not entry:
        raise AuthError("Invalid or expired challenge nonce")

    stored_wallet, expires_at = entry
    if stored_wallet != wallet:
        raise AuthError("Nonce was not issued for this wallet address")
    if dt.datetime.now(dt.timezone.utc) > expires_at:
        del _pending_challenges[nonce]
        raise AuthError("Challenge nonce has expired")

    # Verify ed25519 signature
    _verify_ed25519(wallet, nonce, signature_b64)

    # Consume the nonce (one-time use)
    del _pending_challenges[nonce]
    log.info("wallet_challenge_verified", wallet=wallet[:8] + "...")
    return wallet


def _verify_ed25519(wallet_b58: str, message: str, signature_b64: str) -> None:
    """Verify an ed25519 signature using the cryptography library.

    wallet_b58:    base58-encoded public key (32 bytes)
    message:       the plaintext nonce string that was signed
    signature_b64: base64-encoded 64-byte ed25519 signature
    """
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        from cryptography.exceptions import InvalidSignature

        public_key_bytes = _base58_decode(wallet_b58)
        signature_bytes = base64.b64decode(signature_b64)
        message_bytes = message.encode("utf-8")

        public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        public_key.verify(signature_bytes, message_bytes)
    except Exception as exc:
        raise AuthError(f"Signature verification failed: {exc}") from exc


def _base58_decode(value: str) -> bytes:
    """Decode a base58-encoded string to bytes."""
    ALPHABET = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    result = 0
    for char in value.encode("ascii"):
        result = result * 58 + ALPHABET.index(char)
    # Convert to bytes
    hex_str = format(result, "064x")  # Solana keys are 32 bytes = 64 hex chars
    return bytes.fromhex(hex_str)


def _purge_expired() -> None:
    now = dt.datetime.now(dt.timezone.utc)
    expired = [k for k, (_, exp) in _pending_challenges.items() if now > exp]
    for k in expired:
        del _pending_challenges[k]

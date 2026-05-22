"""HMAC-SHA256 request signing for outbound webhooks.

Outbound webhook requests are signed with a shared secret so the receiver
can verify they originated from this gateway.

Signature format (added as HTTP header):  X-MEMBRA-Signature: hmac_sha256=<hex>
"""
from __future__ import annotations

import hashlib
import hmac
import time


def sign_payload(payload: bytes, secret: str) -> str:
    """Return the HMAC-SHA256 hex digest of *payload* signed with *secret*."""
    sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return f"hmac_sha256={sig}"


def verify_payload(payload: bytes, secret: str, signature_header: str) -> bool:
    """Return True iff *signature_header* matches the expected signature.

    Uses ``hmac.compare_digest`` to prevent timing attacks.
    """
    expected = sign_payload(payload, secret)
    return hmac.compare_digest(expected, signature_header)


def signed_headers(payload: bytes, secret: str) -> dict[str, str]:
    """Return headers dict including the signature and a request timestamp."""
    ts = str(int(time.time()))
    return {
        "X-MEMBRA-Signature": sign_payload(payload, secret),
        "X-MEMBRA-Timestamp": ts,
        "Content-Type": "application/json",
    }

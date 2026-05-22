"""API key hashing and constant-time validation.

Keys are never stored in plaintext.  The caller stores the salted SHA-256
digest; validation re-hashes the supplied key and compares via
``hmac.compare_digest`` to prevent timing attacks.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid

from api.security.secrets import get_api_key_salt


def generate_api_key() -> str:
    """Generate a cryptographically random API key."""
    return "membra_" + secrets.token_urlsafe(32)


def hash_api_key(raw_key: str) -> str:
    """Return a hex-encoded HMAC-SHA256 digest of *raw_key* using the configured salt."""
    salt = get_api_key_salt().encode("utf-8") or uuid.uuid4().bytes
    if isinstance(salt, str):
        salt = salt.encode("utf-8")
    return hmac.new(salt, raw_key.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    """Return True iff *raw_key* hashes to *stored_hash* (constant-time)."""
    expected = hash_api_key(raw_key)
    return hmac.compare_digest(expected, stored_hash)


def derive_key_id(raw_key: str) -> str:
    """Return a stable 12-char hex prefix identifying a key without revealing it."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:12]

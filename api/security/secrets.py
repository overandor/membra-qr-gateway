"""Secrets loader — all secrets come from environment variables.

No plaintext secrets are ever embedded in source code.
This module provides helpers that fetch secrets from the Settings singleton
and validate they are present before use in production contexts.
"""
from __future__ import annotations

from api.core.config import settings
from api.core.errors import GatewayError


def require_jwt_secret() -> str:
    """Return the JWT signing secret, raising if absent."""
    if not settings.JWT_SECRET:
        raise GatewayError("JWT_SECRET is not configured", 500)
    return settings.JWT_SECRET


def require_field_encryption_key() -> bytes:
    """Return the 32-byte AES-GCM key decoded from hex, raising if absent or malformed."""
    raw = settings.FIELD_ENCRYPTION_KEY
    if not raw:
        raise GatewayError("FIELD_ENCRYPTION_KEY is not configured", 500)
    try:
        key = bytes.fromhex(raw)
    except ValueError as exc:
        raise GatewayError(f"FIELD_ENCRYPTION_KEY is not valid hex: {exc}", 500) from exc
    if len(key) != 32:
        raise GatewayError(
            f"FIELD_ENCRYPTION_KEY must be 32 bytes (64 hex chars), got {len(key)}", 500
        )
    return key


def require_webhook_signing_secret() -> str:
    """Return the webhook signing secret, raising if absent."""
    if not settings.WEBHOOK_SIGNING_SECRET:
        raise GatewayError("WEBHOOK_SIGNING_SECRET is not configured", 500)
    return settings.WEBHOOK_SIGNING_SECRET


def require_membra_event_secret() -> str:
    """Return the MEMBRA event secret, raising if absent."""
    if not settings.MEMBRA_EVENT_SECRET:
        raise GatewayError("MEMBRA_EVENT_SECRET is not configured", 500)
    return settings.MEMBRA_EVENT_SECRET


def require_admin_key() -> str:
    """Return the admin API key, raising if absent."""
    if not settings.ADMIN_API_KEY:
        raise GatewayError("ADMIN_API_KEY is not configured", 500)
    return settings.ADMIN_API_KEY


def get_api_key_salt() -> str:
    """Return the API key salt (may be empty, but warn)."""
    return settings.API_KEY_SALT

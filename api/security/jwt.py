"""JWT issue and verify with HS256 (python-jose)."""
from __future__ import annotations

import datetime as dt
from typing import Any

from jose import JWTError, jwt

from api.core.config import settings
from api.core.errors import AuthError


def issue_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    """Issue a signed JWT for *subject*.

    Args:
        subject: Typically a user or API-key identifier.
        extra_claims: Optional additional payload fields.

    Returns:
        Signed JWT string.
    """
    now = dt.datetime.now(dt.timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + dt.timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> dict[str, Any]:
    """Verify *token* and return its claims.

    Raises:
        AuthError: If the token is invalid, expired, or JWT_SECRET is not set.
    """
    if not settings.JWT_SECRET:
        raise AuthError("JWT authentication is not configured")
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return claims
    except JWTError as exc:
        raise AuthError(f"Invalid or expired token: {exc}") from exc


def extract_subject(token: str) -> str:
    """Return the ``sub`` claim from *token*."""
    claims = verify_token(token)
    sub = claims.get("sub")
    if not sub:
        raise AuthError("Token missing subject claim")
    return str(sub)

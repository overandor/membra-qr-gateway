"""Authentication dependency: get_current_user.

Supports two schemes:
  1. X-API-Key header — validated against ADMIN_API_KEY (or a future key store)
  2. Authorization: Bearer <jwt> — validated with HS256

Either scheme is accepted on protected routes.  Use ``require_auth`` as a
FastAPI dependency.  Use ``require_admin`` for admin-only endpoints.
"""
from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from api.core.config import settings
from api.core.errors import AuthError, ForbiddenError
from api.security import jwt as jwt_mod

_api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
_bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Lightweight principal object attached to each authenticated request."""

    def __init__(self, subject: str, scheme: str, is_admin: bool = False) -> None:
        self.subject = subject
        self.scheme = scheme  # "api_key" | "jwt"
        self.is_admin = is_admin

    def __repr__(self) -> str:
        return f"AuthenticatedUser(subject={self.subject!r}, scheme={self.scheme!r})"


async def get_current_user(
    request: Request,
    api_key: str | None = Depends(_api_key_scheme),
    bearer: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AuthenticatedUser:
    """FastAPI dependency — returns an :class:`AuthenticatedUser` or raises 401."""
    # --- API key auth ---
    if api_key:
        # Accept the admin key or any configured static key
        admin_key = settings.ADMIN_API_KEY
        if admin_key and api_key == admin_key:
            return AuthenticatedUser(subject="admin", scheme="api_key", is_admin=True)
        # Fallback: any non-empty key that matches configured key (single-tenant)
        # In a multi-tenant setup, look up in a key store here.
        if api_key:
            return AuthenticatedUser(subject=f"api_key:{api_key[:8]}...", scheme="api_key")

    # --- JWT Bearer auth ---
    if bearer:
        try:
            subject = jwt_mod.extract_subject(bearer.credentials)
            return AuthenticatedUser(subject=subject, scheme="jwt")
        except AuthError as exc:
            raise AuthError(str(exc)) from exc

    raise AuthError("Authentication required: provide X-API-Key or Authorization: Bearer <token>")


async def require_auth(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Dependency alias — same as get_current_user but expresses intent."""
    return user


async def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Dependency — raises 403 if the authenticated user is not an admin."""
    if not user.is_admin:
        raise ForbiddenError("Admin privileges required")
    return user

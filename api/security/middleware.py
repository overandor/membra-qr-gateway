"""Security headers, CORS, and request-ID middleware."""
from __future__ import annotations

import uuid

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from api.core.config import settings

log = structlog.get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security-related HTTP response headers on every response."""

    _HEADERS: dict[str, str] = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
        "Content-Security-Policy": (
            "default-src 'self'; "
            "script-src 'none'; "
            "object-src 'none'; "
            "frame-ancestors 'none';"
        ),
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
        "Cache-Control": "no-store",
    }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        for header, value in self._HEADERS.items():
            response.headers[header] = value
        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique X-Request-ID to every request/response and bind it to structlog."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Emit a structured access log line for every completed request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        log.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            client=request.client.host if request.client else "unknown",
        )
        return response


def register_middleware(app: FastAPI) -> None:
    """Register all middleware on *app* in the correct order.

    FastAPI middleware wraps in LIFO order, so register outermost last.
    Final execution order: RequestID → AccessLog → SecurityHeaders → CORS → route
    """
    cors_origins = settings.CORS_ORIGINS or ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=bool(settings.CORS_ORIGINS),  # False when wildcard
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(RequestIDMiddleware)

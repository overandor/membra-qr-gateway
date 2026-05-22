"""Centralised exception handlers and error response schemas."""
from __future__ import annotations

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

log = structlog.get_logger(__name__)


# ── Response schema ──────────────────────────────────────────────────────────

class ErrorBody(BaseModel):
    ok: bool = False
    error: str
    detail: str | None = None


def error_response(
    message: str,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    detail: str | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorBody(error=message, detail=detail).model_dump(exclude_none=True),
    )


# ── Custom exception types ────────────────────────────────────────────────────

class GatewayError(Exception):
    """Base application exception."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundError(GatewayError):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class AuthError(GatewayError):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(GatewayError):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class ConflictError(GatewayError):
    def __init__(self, message: str = "Resource conflict") -> None:
        super().__init__(message, status.HTTP_409_CONFLICT)


class RateLimitError(GatewayError):
    def __init__(self, message: str = "Rate limit exceeded") -> None:
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS)


# ── Handler registration ──────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(GatewayError)
    async def gateway_error_handler(request: Request, exc: GatewayError) -> JSONResponse:
        log.warning("gateway_error", path=request.url.path, error=exc.message, status=exc.status_code)
        return error_response(exc.message, exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        msg = first.get("msg", "Validation error")
        loc = " -> ".join(str(x) for x in first.get("loc", []))
        log.info("validation_error", path=request.url.path, location=loc, message=msg)
        return error_response(
            message="Request validation failed",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{loc}: {msg}" if loc else msg,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled_exception", path=request.url.path, exc_info=exc)
        return error_response("Internal server error", status.HTTP_500_INTERNAL_SERVER_ERROR)

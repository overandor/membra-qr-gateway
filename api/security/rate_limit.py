"""In-memory token-bucket rate limiter.

Each (client_ip, route_group) pair gets its own bucket.
Buckets are stored in a module-level dict; in a multi-worker deployment
you would swap this for a Redis back-end.

Usage (FastAPI dependency):
    from api.security.rate_limit import default_rate_limit, auth_rate_limit

    @router.post("/login", dependencies=[Depends(auth_rate_limit)])
    async def login(...): ...
"""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import Depends, Request

from api.core.config import settings
from api.core.errors import RateLimitError

# ── Token bucket state ────────────────────────────────────────────────────────
# { (ip, group): (tokens, last_refill_time) }
_buckets: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
_lock = Lock()


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _check_rate_limit(request: Request, group: str, max_per_minute: int) -> None:
    """Raise RateLimitError if the client has exceeded *max_per_minute* requests."""
    ip = _client_ip(request)
    key = (ip, group)
    refill_rate = max_per_minute / 60.0  # tokens per second

    with _lock:
        bucket = _buckets[key]
        now = time.monotonic()
        elapsed = now - bucket[1] if bucket[1] > 0 else 0.0
        # Refill tokens based on elapsed time
        bucket[0] = min(float(max_per_minute), bucket[0] + elapsed * refill_rate)
        bucket[1] = now

        if bucket[0] < 1.0:
            raise RateLimitError(
                f"Rate limit exceeded: max {max_per_minute} requests/minute for this endpoint"
            )
        bucket[0] -= 1.0


async def default_rate_limit(request: Request) -> None:
    """Dependency: 100 req/min per IP (default routes)."""
    _check_rate_limit(request, "default", settings.RATE_LIMIT_DEFAULT)


async def auth_rate_limit(request: Request) -> None:
    """Dependency: 20 req/min per IP (auth/wallet routes)."""
    _check_rate_limit(request, "auth", settings.RATE_LIMIT_AUTH)


def reset_buckets() -> None:
    """Clear all rate-limit state — used in tests."""
    with _lock:
        _buckets.clear()

"""Pydantic validators and input sanitisation helpers.

Import these annotated types or validators into your Pydantic models to get
automatic, consistent validation across all routes.
"""
from __future__ import annotations

import re
from typing import Annotated

from pydantic import AfterValidator, Field

# ── Regex patterns ────────────────────────────────────────────────────────────

_SOLANA_ADDRESS_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_URL_SCHEMES = {"http", "https"}


def _validate_solana_address(v: str) -> str:
    if v and not _SOLANA_ADDRESS_RE.match(v):
        raise ValueError("Invalid Solana base58 address")
    return v


def _validate_email(v: str) -> str:
    if v and not _EMAIL_RE.match(v):
        raise ValueError("Invalid email address format")
    return v


def _validate_url(v: str) -> str:
    scheme = v.split("://")[0].lower() if "://" in v else ""
    if scheme not in _URL_SCHEMES:
        raise ValueError(f"URL must use http or https scheme, got: {scheme!r}")
    return v


def _strip_and_limit(max_len: int):  # noqa: ANN201
    """Return a validator that strips whitespace and truncates to *max_len*."""
    def _validate(v: str) -> str:
        v = v.strip()
        if len(v) > max_len:
            raise ValueError(f"Value exceeds maximum length of {max_len}")
        return v
    return AfterValidator(_validate)


# ── Annotated types ───────────────────────────────────────────────────────────

SolanaAddress = Annotated[str, AfterValidator(_validate_solana_address), Field(max_length=44)]
EmailAddress = Annotated[str, AfterValidator(_validate_email), Field(max_length=254)]
HttpUrl = Annotated[str, AfterValidator(_validate_url), Field(max_length=2048)]
ShortText = Annotated[str, _strip_and_limit(255)]
LongText = Annotated[str, _strip_and_limit(4096)]


def sanitise_sql_like(value: str) -> str:
    """Escape % and _ in a value destined for a SQL LIKE clause."""
    return value.replace("%", r"\%").replace("_", r"\_")

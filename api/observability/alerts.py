"""Alert rule definitions — threshold checks evaluated on demand.

These rules are designed to be called from a background task or an external
scheduler.  Each rule returns an :class:`AlertResult` describing the current
state.  Rules that fire can be delivered via notification_service.send_webhook.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any

import structlog

from api.observability.metrics import (
    AUTH_FAILURES,
    RATE_LIMIT_HITS,
    CHAIN_RPC_ERRORS,
)

log = structlog.get_logger(__name__)


@dataclass
class AlertResult:
    name: str
    firing: bool
    severity: str  # "info" | "warning" | "critical"
    value: float
    threshold: float
    message: str
    labels: dict[str, Any] = field(default_factory=dict)
    evaluated_at: str = field(default_factory=lambda: dt.datetime.now(dt.timezone.utc).isoformat())


def check_high_auth_failures(threshold: float = 10.0) -> AlertResult:
    """Fire when auth failures exceed *threshold* total."""
    value = AUTH_FAILURES._value.get()  # type: ignore[attr-defined]
    firing = value >= threshold
    return AlertResult(
        name="HighAuthFailures",
        firing=firing,
        severity="warning" if value < threshold * 2 else "critical",
        value=value,
        threshold=threshold,
        message=(
            f"Auth failures ({value:.0f}) exceeded threshold ({threshold:.0f})"
            if firing
            else f"Auth failures ({value:.0f}) below threshold ({threshold:.0f})"
        ),
    )


def check_high_rate_limit_hits(route_group: str = "default", threshold: float = 50.0) -> AlertResult:
    """Fire when rate-limit rejections for *route_group* exceed *threshold*."""
    # Collect total across all label values as a proxy
    try:
        total = sum(
            sample.value
            for metric in RATE_LIMIT_HITS.collect()
            for sample in metric.samples
            if sample.labels.get("route_group") == route_group
        )
    except Exception:
        total = 0.0
    firing = total >= threshold
    return AlertResult(
        name="HighRateLimitHits",
        firing=firing,
        severity="warning",
        value=total,
        threshold=threshold,
        message=(
            f"Rate-limit hits for {route_group!r} ({total:.0f}) exceeded threshold"
            if firing
            else f"Rate-limit hits for {route_group!r} ({total:.0f}) below threshold"
        ),
        labels={"route_group": route_group},
    )


def check_chain_rpc_errors(method: str = "getAccountInfo", threshold: float = 5.0) -> AlertResult:
    """Fire when Solana RPC errors for *method* exceed *threshold*."""
    try:
        total = sum(
            sample.value
            for metric in CHAIN_RPC_ERRORS.collect()
            for sample in metric.samples
            if sample.labels.get("method") == method
        )
    except Exception:
        total = 0.0
    firing = total >= threshold
    return AlertResult(
        name="ChainRPCErrors",
        firing=firing,
        severity="critical" if total >= threshold * 2 else "warning",
        value=total,
        threshold=threshold,
        message=(
            f"Chain RPC errors for {method!r} ({total:.0f}) exceeded threshold"
            if firing
            else f"Chain RPC errors for {method!r} ({total:.0f}) below threshold"
        ),
        labels={"method": method},
    )


def evaluate_all() -> list[AlertResult]:
    """Evaluate all defined alert rules and return results."""
    rules = [
        check_high_auth_failures(),
        check_high_rate_limit_hits("default"),
        check_high_rate_limit_hits("auth"),
        check_chain_rpc_errors("getAccountInfo"),
        check_chain_rpc_errors("getSlot"),
    ]
    for r in rules:
        if r.firing:
            log.warning("alert_firing", name=r.name, severity=r.severity, message=r.message)
    return rules

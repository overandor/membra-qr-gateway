"""OpenTelemetry tracer setup.

In production, configure OTEL_EXPORTER_OTLP_ENDPOINT to ship traces to your
collector (Jaeger, Tempo, etc.).  When no exporter is configured the tracer
falls back to a no-op provider so application code can always call
``get_tracer()`` without branching.
"""
from __future__ import annotations

import os

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter


def configure_tracing(service_name: str = "membra-qr-gateway") -> None:
    """Initialise the OpenTelemetry tracer provider.

    If OTEL_EXPORTER_OTLP_ENDPOINT is set, an OTLP gRPC exporter is used.
    Otherwise traces are written to stdout (dev/test) or silently dropped
    if OTEL_TRACES_EXPORTER=none.
    """
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    exporter_name = os.getenv("OTEL_TRACES_EXPORTER", "console").lower()

    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
            provider.add_span_processor(BatchSpanProcessor(exporter))
        except ImportError:
            # opentelemetry-exporter-otlp not installed — fall back to console
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    elif exporter_name != "none":
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)


def get_tracer(name: str = "membra-qr-gateway") -> trace.Tracer:
    """Return the application tracer for *name*."""
    return trace.get_tracer(name)

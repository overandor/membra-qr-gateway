# ─────────────────────────────────────────────────────────────────────────────
# MEMBRA QR Gateway — API Dockerfile (Python FastAPI only)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build dependencies ───────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL org.opencontainers.image.title="MEMBRA QR Gateway API"
LABEL org.opencontainers.image.description="FastAPI backend for MEMBRA QR Gateway"
LABEL org.opencontainers.image.vendor="MEMBRA"

WORKDIR /app

# Minimal runtime system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages
COPY --from=builder /install /usr/local

# Copy API source
COPY api/ ./api/
COPY app.py ./

# Create non-root user and required directories
RUN groupadd --gid 1001 membra \
    && useradd --uid 1001 --gid membra --shell /bin/bash --create-home membra \
    && mkdir -p /app/data /app/storage/backups /app/storage/exports /app/storage/receipts \
    && chown -R membra:membra /app

USER membra

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DB_PATH=/app/data/membra.sqlite3 \
    LOG_LEVEL=INFO \
    PORT=7860

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["python", "-m", "uvicorn", "api.main:app", \
     "--host", "0.0.0.0", \
     "--port", "7860", \
     "--workers", "2", \
     "--log-level", "info", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*"]

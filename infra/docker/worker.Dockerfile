# ─────────────────────────────────────────────────────────────────────────────
# MEMBRA QR Gateway — Worker Dockerfile (background task workers)
# Shares the same Python base as api.Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build dependencies ───────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt ./requirements.txt

# Workers may need additional packages beyond the API
COPY workers/requirements.txt ./worker-requirements.txt 2>/dev/null || true

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt \
    && if [ -f worker-requirements.txt ]; then \
         pip install --no-cache-dir --prefix=/install -r worker-requirements.txt; \
       fi

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL org.opencontainers.image.title="MEMBRA QR Gateway Worker"
LABEL org.opencontainers.image.description="Background task workers for MEMBRA QR Gateway"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages
COPY --from=builder /install /usr/local

# Copy API source (workers import from api/)
COPY api/ ./api/
COPY workers/ ./workers/
COPY app.py ./

# Non-root user
RUN groupadd --gid 1001 membra \
    && useradd --uid 1001 --gid membra --shell /bin/bash --create-home membra \
    && mkdir -p /app/data /app/storage/backups /app/storage/exports /app/storage/receipts \
    && chown -R membra:membra /app

USER membra

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DB_PATH=/app/data/membra.sqlite3 \
    LOG_LEVEL=INFO

# WORKER_MODULE can be overridden at runtime:
#   docker run -e WORKER_MODULE=workers.chain_sync_worker membra-worker
ENV WORKER_MODULE=workers.receipt_worker

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

CMD ["python", "-m", "${WORKER_MODULE}"]

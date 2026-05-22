# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY vite.config.js postcss.config.js tailwind.config.js index.html ./
COPY src/ ./src/
COPY public/ ./public/ 2>/dev/null || true

ARG VITE_API_URL=http://localhost:7860
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build Python dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS python-deps

WORKDIR /app

# Install build tools for any compiled deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Final production image
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS production

WORKDIR /app

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from deps stage
COPY --from=python-deps /install /usr/local

# Copy API source
COPY api/ ./api/
COPY app.py ./

# Copy frontend build output (served as static files or via nginx in prod)
COPY --from=frontend-builder /app/dist ./static/

# Create non-root user and necessary directories
RUN groupadd --gid 1001 membra \
    && useradd --uid 1001 --gid membra --shell /bin/bash --create-home membra \
    && mkdir -p /app/data /app/storage/backups /app/storage/exports /app/storage/receipts \
    && chown -R membra:membra /app

USER membra

# Environment defaults (override at runtime)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DB_PATH=/app/data/membra.sqlite3 \
    LOG_LEVEL=INFO \
    PORT=7860

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "2"]

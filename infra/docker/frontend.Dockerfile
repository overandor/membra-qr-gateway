# ─────────────────────────────────────────────────────────────────────────────
# MEMBRA QR Gateway — Frontend Dockerfile (Node build + nginx serve)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfiles for layer caching
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source files
COPY vite.config.js postcss.config.js tailwind.config.js index.html ./
COPY src/ ./src/

# Copy public assets if they exist (|| true handles missing dir gracefully)
RUN mkdir -p public
COPY public/ ./public/

ARG VITE_API_URL=http://localhost:7860
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

LABEL org.opencontainers.image.title="MEMBRA QR Gateway Frontend"
LABEL org.opencontainers.image.description="React SPA served by nginx"

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing (try_files fallback to index.html)
RUN printf 'server {\n\
    listen 8080;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # SPA fallback\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Cache static assets aggressively\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # Security headers\n\
    add_header X-Frame-Options "DENY";\n\
    add_header X-Content-Type-Options "nosniff";\n\
    add_header X-XSS-Protection "1; mode=block";\n\
\n\
    # Gzip\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
    gzip_min_length 1024;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Nginx runs as non-root on port 8080
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Use non-root nginx user (already exists in nginx:alpine)
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/ > /dev/null || exit 1

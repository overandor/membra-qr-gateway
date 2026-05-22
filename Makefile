.PHONY: dev build test lint docker-up docker-down migrate audit deploy-staging deploy-prod help

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ── Colors ────────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(CYAN)MEMBRA QR Gateway — Available Commands$(RESET)"
	@echo ""
	@echo "  $(CYAN)make dev$(RESET)              Start frontend (Vite) + API (uvicorn) in parallel"
	@echo "  $(CYAN)make build$(RESET)            Production build (frontend + collect static)"
	@echo "  $(CYAN)make test$(RESET)             Run all tests (vitest + pytest + cargo test)"
	@echo "  $(CYAN)make lint$(RESET)             Run all linters (eslint + ruff + black + clippy)"
	@echo "  $(CYAN)make docker-up$(RESET)        Start local dev stack with docker-compose"
	@echo "  $(CYAN)make docker-down$(RESET)      Stop local dev stack"
	@echo "  $(CYAN)make migrate$(RESET)          Apply pending SQL migrations"
	@echo "  $(CYAN)make audit$(RESET)            Security audit (npm + pip + cargo)"
	@echo "  $(CYAN)make deploy-staging$(RESET)   Deploy to staging environment"
	@echo "  $(CYAN)make deploy-prod$(RESET)      Deploy to production (requires confirmation)"
	@echo ""

# ── Development ───────────────────────────────────────────────────────────────
dev:
	@echo "$(CYAN)Starting MEMBRA QR Gateway in development mode...$(RESET)"
	@bash scripts/dev.sh

# ── Build ─────────────────────────────────────────────────────────────────────
build:
	@echo "$(CYAN)Building production assets...$(RESET)"
	@bash scripts/build.sh

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	@echo "$(CYAN)Running all tests...$(RESET)"
	@bash scripts/test.sh

test-frontend:
	@echo "$(CYAN)Running frontend tests...$(RESET)"
	npx vitest run

test-api:
	@echo "$(CYAN)Running API tests...$(RESET)"
	cd api && python -m pytest tests/ -v --tb=short

test-protocol:
	@echo "$(CYAN)Running protocol tests...$(RESET)"
	cd protocol && cargo test && anchor test --skip-local-validator

# ── Lint ──────────────────────────────────────────────────────────────────────
lint:
	@echo "$(CYAN)Running all linters...$(RESET)"
	@bash scripts/lint.sh

lint-frontend:
	npx eslint src/ --ext .ts,.tsx --max-warnings 0

lint-api:
	ruff check api/ && black --check api/

lint-protocol:
	cd protocol && cargo clippy -- -D warnings

# ── Format ────────────────────────────────────────────────────────────────────
fmt:
	@echo "$(CYAN)Formatting code...$(RESET)"
	npx prettier --write "src/**/*.{ts,tsx,css}"
	black api/
	cd protocol && cargo fmt

# ── Docker ────────────────────────────────────────────────────────────────────
docker-up:
	@echo "$(CYAN)Starting Docker dev stack...$(RESET)"
	docker-compose up --build -d
	@echo "$(CYAN)Services running:$(RESET)"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  API:       http://localhost:7860"

docker-down:
	@echo "$(CYAN)Stopping Docker dev stack...$(RESET)"
	docker-compose down

docker-build:
	@echo "$(CYAN)Building Docker image...$(RESET)"
	docker build -t membra-qr-gateway:latest .

docker-prod:
	@echo "$(CYAN)Starting production Docker stack...$(RESET)"
	docker-compose -f docker-compose.prod.yml up -d

docker-logs:
	docker-compose logs -f

# ── Database ──────────────────────────────────────────────────────────────────
migrate:
	@echo "$(CYAN)Applying migrations...$(RESET)"
	@bash scripts/migrate.sh

migrate-status:
	@echo "$(CYAN)Migration status:$(RESET)"
	@sqlite3 $${DB_PATH:-data/membra.sqlite3} "SELECT name, applied_at FROM migrations_applied ORDER BY applied_at;" 2>/dev/null || echo "No migrations applied yet"

# ── Security ──────────────────────────────────────────────────────────────────
audit:
	@echo "$(CYAN)Running security audits...$(RESET)"
	@bash scripts/security_scan.sh

# ── Backup / Restore ──────────────────────────────────────────────────────────
backup:
	@echo "$(CYAN)Backing up database...$(RESET)"
	@bash scripts/backup.sh

restore:
	@if [ -z "$(FILE)" ]; then echo "Usage: make restore FILE=backup-2024-01-01.sqlite3"; exit 1; fi
	@bash scripts/restore.sh $(FILE)

# ── Secrets ───────────────────────────────────────────────────────────────────
rotate-keys:
	@echo "$(CYAN)Rotating secrets...$(RESET)"
	@bash scripts/rotate_keys.sh

# ── Bootstrap ─────────────────────────────────────────────────────────────────
bootstrap:
	@echo "$(CYAN)Setting up development environment...$(RESET)"
	@bash scripts/bootstrap.sh

# ── Deploy ────────────────────────────────────────────────────────────────────
deploy-staging:
	@echo "$(CYAN)Deploying to staging...$(RESET)"
	@bash scripts/deploy_staging.sh

deploy-prod:
	@echo "$(CYAN)Deploying to production...$(RESET)"
	@bash scripts/deploy_production.sh

# ── Monitoring ────────────────────────────────────────────────────────────────
monitoring-up:
	@echo "$(CYAN)Starting monitoring stack (Prometheus + Grafana + Loki)...$(RESET)"
	docker-compose -f infra/monitoring/docker-compose.monitoring.yml up -d

monitoring-down:
	docker-compose -f infra/monitoring/docker-compose.monitoring.yml down

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	rm -rf dist/
	rm -rf node_modules/.vite/
	find api/ -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find api/ -name "*.pyc" -delete 2>/dev/null || true

clean-all: clean
	@echo "$(CYAN)Cleaning all generated files...$(RESET)"
	rm -rf node_modules/
	rm -rf protocol/target/

.PHONY: help install test lint build frontend backend clean docker run

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install Python and Node dependencies
	pip install -r requirements.txt
	npm install

test: ## Run backend pytest suite
	python -m pytest tests/ -v

lint: ## Lint Python and verify frontend build
	python -m py_compile app.py
	npm run build

build: ## Build production frontend
	npm run build

frontend: ## Start frontend dev server
	npm run dev

backend: ## Start backend dev server (single worker)
	python -m uvicorn app:app --host 0.0.0.0 --port 7860 --reload

docker: ## Build and run with docker-compose
	docker-compose up --build -d

docker-down: ## Stop docker-compose services
	docker-compose down

clean: ## Remove build artifacts and caches
	rm -rf dist/ build/ __pycache__/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete

run: ## Start full stack locally (backend + frontend in parallel — requires tmux or two terminals)
	@echo "Start backend:  make backend"
	@echo "Start frontend: make frontend"

# =============================================================================
# JobVault — one entry point for the whole stack.
#
#   make setup   # once: write .env from .env.example, then edit in your secrets
#   make up      # build + start postgres, backend-express, frontend-next
#   make doctor  # "why isn't X working?" — checks env, containers, AI status
#
# `make` on its own lists every target.
#
# Env model: the repo-root .env is the single source of truth. Compose reads it
# automatically for ${VAR} interpolation (it sits next to docker-compose.yml),
# and recipes that need a value source the same file — never a per-app .env.
# See /.env.example for the full rationale.
# =============================================================================

SHELL := /bin/bash
DC    := docker compose

# Source the root .env inside a recipe (petnest-style). Trailing `set +a` keeps
# the exit status at 0 when .env does not exist yet.
LOAD_ENV := set -a; [ -f .env ] && . ./.env; set +a;

.DEFAULT_GOAL := help
.PHONY: help setup doctor up start down stop restart rebuild logs ps urls \
        seed migrate generate studio psql sh sh-web \
        test test-backend test-web typecheck lint gates build-web \
        reset-db clean

# --- Meta --------------------------------------------------------------------

help: ## List every target
	@echo "JobVault — make targets"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  Args:  s=<service>  (backend-express | frontend-next | postgres)"

setup: ## Create .env from .env.example (never overwrites an existing one)
	@if [ -f .env ]; then \
		echo "✅ .env already exists — leaving it alone."; \
	else \
		cp .env.example .env && chmod 600 .env && \
		echo "✅ Wrote .env from .env.example."; \
		echo "   Now edit it: GEMINI_API_KEY (AI features) and JWT_SECRET (>= 32 chars)."; \
	fi

doctor: ## Diagnose the stack: env keys, containers, API + AI status
	@echo "── env ──────────────────────────────────────────────"
	@if [ ! -f .env ]; then echo "  ❌ no root .env — run: make setup"; exit 1; fi
	@echo "  ✅ root .env present"
	@$(LOAD_ENV) \
	 for k in DATABASE_URL CORS_ORIGINS JWT_SECRET; do \
	   if [ -z "$${!k}" ]; then echo "  ❌ $$k is unset (required)"; else echo "  ✅ $$k set"; fi; \
	 done; \
	 if [ -z "$$GEMINI_API_KEY" ]; then \
	   echo "  ⚠️  GEMINI_API_KEY unset — résumé/cover-letter AI stays off"; \
	 else echo "  ✅ GEMINI_API_KEY set"; fi; \
	 if [ $${#JWT_SECRET} -lt 32 ]; then echo "  ❌ JWT_SECRET shorter than 32 chars"; fi
	@missing=$$(comm -23 \
	  <(grep -oE '^[A-Z0-9_]+' .env.example | sort -u) \
	  <(grep -oE '^[A-Z0-9_]+' .env | sort -u) | tr '\n' ' '); \
	 if [ -n "$$missing" ]; then \
	   echo "  ⚠️  in .env.example but not your .env: $$missing"; \
	   echo "      (compose warns for any it interpolates without a default)"; \
	 else echo "  ✅ .env covers every key in .env.example"; fi
	@for f in backend-express/.env frontend-next/.env; do \
	  if [ -f $$f ]; then \
	    echo "  ⚠️  stale $$f — the root .env is authoritative; delete it"; \
	  fi; \
	done
	@echo "── containers ───────────────────────────────────────"
	@$(DC) ps --format '{{.Service}}: {{.State}} ({{.Status}})' 2>/dev/null | sed 's/^/  /' || echo "  (compose not running)"
	@echo "── api ──────────────────────────────────────────────"
	@$(LOAD_ENV) \
	 base=http://localhost:$${BACKEND_PORT:-3000}; \
	 echo "  health:    $$(curl -sf $$base/api/health || echo '❌ unreachable')"; \
	 echo "  ai/status: $$(curl -sf $$base/api/ai/status || echo '❌ unreachable')"

urls: ## Print the app + API URLs for your configured ports
	@$(LOAD_ENV) \
	 echo "  App      http://localhost:$${FRONTEND_PORT:-8080}"; \
	 echo "  API      http://localhost:$${BACKEND_PORT:-3000}/api/health"; \
	 echo "  Postgres localhost:$${DB_PORT_EXTERNAL:-5432}/$${DB_NAME:-jobvault}"

# --- Lifecycle ---------------------------------------------------------------

up: setup ## Build + start the whole stack (idempotent)
	$(DC) up -d --build
	@$(MAKE) --no-print-directory urls

start: ## Start existing containers without rebuilding
	$(DC) up -d

down: ## Stop the stack (keeps the database volume)
	$(DC) down

stop: down ## Alias for `down`

restart: ## Restart one service        (make restart s=backend-express)
	$(DC) restart $(or $(s),backend-express)

rebuild: ## Full rebuild — use after adding npm deps
	$(DC) up -d --build --force-recreate --renew-anon-volumes
	@$(MAKE) --no-print-directory urls

logs: ## Follow logs, all or one       (make logs s=backend-express)
	$(DC) logs -f $(s)

ps: ## Show container status
	$(DC) ps

# --- Database ----------------------------------------------------------------

seed: ## Fill the DB with demo data (idempotent, one demo user)
	$(DC) exec backend-express npm run db:seed

migrate: ## Apply pending Drizzle migrations
	$(DC) exec backend-express npm run db:migrate

generate: ## Generate a migration from schema changes
	$(DC) exec backend-express npm run db:generate

studio: ## Open Drizzle Studio
	$(DC) exec backend-express npm run db:studio

psql: ## Open a psql shell on the app database
	@$(LOAD_ENV) $(DC) exec postgres psql -U $${DB_USER:-postgres} -d $${DB_NAME:-jobvault}

reset-db: ## DESTRUCTIVE — drop the database volume, then re-migrate + seed
	@read -p "Delete ALL local data in the postgres volume? [y/N] " ok; \
	 [ "$$ok" = "y" ] || { echo "aborted"; exit 1; }
	$(DC) down -v
	$(DC) up -d --build
	@echo "waiting for the backend to apply migrations..."
	@$(LOAD_ENV) \
	 for i in $$(seq 1 60); do \
	   curl -sf http://localhost:$${BACKEND_PORT:-3000}/api/health >/dev/null && break || sleep 2; \
	 done
	$(MAKE) --no-print-directory seed

# --- Shells ------------------------------------------------------------------

sh: ## Shell into a service          (make sh s=backend-express)
	$(DC) exec $(or $(s),backend-express) sh

sh-web: ## Shell into the frontend container
	$(DC) exec frontend-next sh

# --- Quality gates -----------------------------------------------------------

test-backend: ## Backend tests (Vitest, needs postgres up)
	$(DC) exec backend-express npm run test

test-web: ## Frontend tests (Vitest + RTL)
	$(DC) exec frontend-next npm run test

test: test-backend test-web ## Run both test suites

typecheck: ## Typecheck both apps
	$(DC) exec backend-express npm run typecheck
	$(DC) exec frontend-next npm run typecheck

lint: ## Lint both apps
	$(DC) exec backend-express npm run lint
	$(DC) exec frontend-next npm run lint

build-web: ## Verify the production frontend build (host .next stays untouched)
	docker build --target production ./frontend-next

gates: typecheck lint test build-web ## Everything CI would check

# --- Cleanup -----------------------------------------------------------------

clean: ## Stop the stack and remove volumes + orphans
	@read -p "Remove containers AND volumes (database included)? [y/N] " ok; \
	 [ "$$ok" = "y" ] || { echo "aborted"; exit 1; }
	$(DC) down -v --remove-orphans

# --- Mobile (Expo) -----------------------------------------------------------
# The documented exception to "everything goes through Compose": Metro runs on
# the host, because it must be reachable from a phone or emulator on the LAN and
# needs the Android SDK. It therefore reads mobile/.env, not the root .env.

.PHONY: mobile mobile-android test-mobile

mobile: ## Start the Expo dev server on the host (mobile/, not in Compose)
	cd mobile && npx expo start

mobile-android: ## Build + run a local Android dev build (free, no EAS account)
	cd mobile && npx expo run:android

test-mobile: ## Mobile tests (jest-expo + React Native Testing Library)
	npm --prefix mobile test

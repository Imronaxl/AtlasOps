.PHONY: help up down restart status logs build pull clean nuke backup restore healthcheck deploy cleanup rotate-logs test lint

COMPOSE := docker compose
ENV_FILE := .env

ifeq (,$(wildcard $(ENV_FILE)))
  ENV_ARG := --env-file .env.example
else
  ENV_ARG := --env-file $(ENV_FILE)
endif

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Start the stack
	$(COMPOSE) $(ENV_ARG) up -d
	@echo ""
	@echo "\033[32m[✓]\033[0m Services starting. Run 'make status' to check."

down: ## Stop the stack
	$(COMPOSE) $(ENV_ARG) down

restart: ## Restart all services
	$(COMPOSE) $(ENV_ARG) restart

status: ## Show container status
	$(COMPOSE) $(ENV_ARG) ps

logs: ## Follow logs of all services
	$(COMPOSE) $(ENV_ARG) logs -f --tail=50

logs-%: ## Follow logs of one service, e.g. make logs-api
	$(COMPOSE) $(ENV_ARG) logs -f --tail=50 $*

build: ## Rebuild custom images
	$(COMPOSE) $(ENV_ARG) build --no-cache

pull: ## Pull pinned images
	$(COMPOSE) $(ENV_ARG) pull

clean: ## Prune stopped containers, dangling images and networks
	docker container prune -f
	docker image prune -f
	docker network prune -f

nuke: ## Stop the stack and delete its volumes
	$(COMPOSE) $(ENV_ARG) down -v --remove-orphans
	docker image prune -f

backup: ## Dump PostgreSQL to backups/
	@bash scripts/backup.sh

restore: ## Restore PostgreSQL: make restore FILE=backups/backup_<timestamp>.sql.gz
	@bash scripts/restore.sh $(FILE)

healthcheck: ## Check containers, endpoints, disk and memory
	@bash scripts/healthcheck.sh

deploy: ## Build and roll out the stack
	@bash scripts/deploy.sh

cleanup: ## Remove old Docker artifacts
	@bash scripts/cleanup.sh

rotate-logs: ## Rotate files in logs/
	@bash scripts/rotate_logs.sh

test: ## Run API tests (needs TEST_DATABASE_URL) and alert rule tests
	cd api && python -m pytest
	docker run --rm -v "$(CURDIR)/monitoring/prometheus:/rules" --entrypoint promtool prom/prometheus:v2.55.1 test rules /rules/tests/alert_rules_test.yml

lint: ## Lint Python, shell scripts and Prometheus/Alertmanager config
	cd api && ruff check src tests && ruff format --check src tests
	shellcheck -x scripts/*.sh
	docker run --rm -v "$(CURDIR)/monitoring/prometheus:/p" --entrypoint promtool prom/prometheus:v2.55.1 check rules /p/alert.rules.yml
	docker run --rm -v "$(CURDIR)/monitoring/alertmanager:/a" --entrypoint amtool prom/alertmanager:v0.27.0 check-config /a/config.yml

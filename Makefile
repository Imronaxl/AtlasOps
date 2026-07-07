.PHONY: help up down restart status logs build pull clean backup restore healthcheck

COMPOSE := docker compose
ENV_FILE := .env

ifeq (,$(wildcard $(ENV_FILE)))
  ENV_ARG := --env-file .env.example
else
  ENV_ARG := --env-file $(ENV_FILE)
endif

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Start all services
	$(COMPOSE) $(ENV_ARG) up -d
	@echo ""
	@echo "\033[32m[✓]\033[0m Services starting. Run 'make status' to check."

down: ## Stop all services
	$(COMPOSE) $(ENV_ARG) down

restart: ## Restart all services
	$(COMPOSE) $(ENV_ARG) restart

status: ## Show container status
	$(COMPOSE) $(ENV_ARG) ps

logs: ## Follow all logs
	$(COMPOSE) $(ENV_ARG) logs -f --tail=50

logs-%: ## Follow logs for a specific service (e.g., make logs-api)
	$(COMPOSE) $(ENV_ARG) logs -f --tail=50 $*

build: ## Build custom images
	$(COMPOSE) $(ENV_ARG) build --no-cache

pull: ## Pull latest base images
	$(COMPOSE) $(ENV_ARG) pull

clean: ## Remove stopped containers and dangling images
	docker container prune -f
	docker image prune -f
	docker network prune -f

nuke: ## Remove everything including volumes (DESTRUCTIVE)
	$(COMPOSE) $(ENV_ARG) down -v --remove-orphans
	docker image prune -f

backup: ## Backup PostgreSQL database
	@bash scripts/backup.sh

restore: ## Restore PostgreSQL database from backup
	@bash scripts/restore.sh

healthcheck: ## Check health of all services
	@bash scripts/healthcheck.sh

deploy: ## Deploy with zero-downtime
	@bash scripts/deploy.sh

cleanup: ## Cleanup Docker resources
	@bash scripts/cleanup.sh

rotate-logs: ## Rotate container logs
	@bash scripts/rotate_logs.sh

.PHONY: help up down restart status logs build pull clean backup restore healthcheck

COMPOSE := docker compose
ENV_FILE := .env

ifeq (,$(wildcard $(ENV_FILE)))
  ENV_ARG := --env-file .env.example
else
  ENV_ARG := --env-file $(ENV_FILE)
endif

help: 
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up:
	$(COMPOSE) $(ENV_ARG) up -d
	@echo ""
	@echo "\033[32m[✓]\033[0m Services starting. Run 'make status' to check."

down:
	$(COMPOSE) $(ENV_ARG) down

restart:
	$(COMPOSE) $(ENV_ARG) restart

status:
	$(COMPOSE) $(ENV_ARG) ps

logs: 
	$(COMPOSE) $(ENV_ARG) logs -f --tail=50

logs-%: 
	$(COMPOSE) $(ENV_ARG) logs -f --tail=50 $*

build:
	$(COMPOSE) $(ENV_ARG) build --no-cache

pull: 
	$(COMPOSE) $(ENV_ARG) pull

clean: 
	docker container prune -f
	docker image prune -f
	docker network prune -f

nuke: 
	$(COMPOSE) $(ENV_ARG) down -v --remove-orphans
	docker image prune -f

backup
	@bash scripts/backup.sh

restore: 
	@bash scripts/restore.sh

healthcheck: 
	@bash scripts/healthcheck.sh

deploy: 
	@bash scripts/deploy.sh

cleanup:
	@bash scripts/cleanup.sh

rotate-logs:
	@bash scripts/rotate_logs.sh

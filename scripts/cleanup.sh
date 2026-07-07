#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
    dry_run=true
    warn "DRY RUN MODE — no changes will be made"
fi

log "${BOLD}Docker Disk Usage Before${NC}"
docker system df

echo ""

log "${BOLD}Removing dangling images${NC}"
if $dry_run; then
    docker images -f "dangling=true" -q | head -5
else
    docker image prune -f 2>/dev/null | tail -1
fi

echo ""
log "${BOLD}Removing unused containers${NC}"
if $dry_run; then
    docker ps -a --filter "status=exited" --format "{{.Names}}" | head -5
else
    docker container prune -f 2>/dev/null | tail -1
fi

echo ""
log "${BOLD}Removing unused networks${NC}"
if $dry_run; then
    docker network ls --filter "type=custom" --format "{{.Name}}" | grep -v "^infra-net$" | head -5
else
    docker network prune -f 2>/dev/null | tail -1
fi

echo ""
log "${BOLD}Removing build cache${NC}"
if $dry_run; then
    docker builder du --format "{{.Size}}" | head -1
else
    docker builder prune -f --filter "until=168h" 2>/dev/null | tail -1
fi

echo ""
log "${BOLD}Removing unused volumes (non-project)${NC}"
if $dry_run; then
    docker volume ls -q --filter "dangling=true" | head -5
else
    docker volume prune -f --filter "label!=com.docker.compose.project=infra-monitor" 2>/dev/null | tail -1
fi

echo ""
log "${BOLD}Docker Disk Usage After${NC}"
docker system df

echo ""
success "${BOLD}Cleanup complete${NC}"

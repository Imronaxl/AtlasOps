#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

LOG_FILE="/var/log/infra-monitor/deploy.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

die() { error "$1"; exit 1; }

cleanup() {
    if [[ $? -ne 0 ]]; then
        warn "Deploy failed. Check logs at ${LOG_FILE}"
    fi
}
trap cleanup EXIT

mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Deployment started at ${TIMESTAMP} ===" >> "$LOG_FILE"

log "${BOLD}Pre-flight checks${NC}"

[[ -f "docker-compose.yml" ]] || die "docker-compose.yml not found"
[[ -f ".env" ]] || warn ".env not found, using .env.example"

docker compose config --quiet 2>/dev/null || die "docker-compose.yml is invalid"

for cmd in docker curl; do
    command -v "$cmd" &>/dev/null || die "${cmd} is not installed"
done

docker info &>/dev/null || die "Docker daemon is not running"

log "${BOLD}Pulling base images${NC}"
docker compose pull --quiet 2>> "$LOG_FILE" || warn "Some images failed to pull"

log "${BOLD}Building custom images${NC}"
docker compose build --no-cache 2>> "$LOG_FILE" || die "Build failed"

log "${BOLD}Deploying services${NC}"
docker compose up -d --remove-orphans 2>> "$LOG_FILE"

log "${BOLD}Waiting for health checks${NC}"
MAX_WAIT=60
INTERVAL=5
ELAPSED=0

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
    HEALTHY=$(docker compose ps --format json 2>/dev/null | grep -c '"healthy"' || true)
    TOTAL=$(docker compose ps --format json 2>/dev/null | wc -l || true)

    if [[ "$HEALTHY" -eq "$TOTAL" ]] && [[ "$TOTAL" -gt 0 ]]; then
        success "All ${TOTAL} services are healthy"
        break
    fi

    log "  ${HEALTHY}/${TOTAL} services healthy (waiting ${ELAPSED}s/${MAX_WAIT}s)"
    sleep "$INTERVAL"
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    warn "Some services may not be healthy yet"
    docker compose ps
fi

log "${BOLD}Cleaning up${NC}"
docker image prune -f --filter "until=24h" &>/dev/null || true

echo "=== Deployment completed at $(date +%Y%m%d_%H%M%S) ===" >> "$LOG_FILE"

echo ""
success "${BOLD}Deployment complete${NC}"
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
log "Run 'make logs' to follow service logs"
log "Run 'make healthcheck' to verify all services"

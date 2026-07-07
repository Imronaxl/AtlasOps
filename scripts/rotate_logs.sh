#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

MAX_LOG_SIZE_MB=50
RETENTION_DAYS=30
LOG_DIR="/var/log/infra-monitor"

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

mkdir -p "${LOG_DIR}"

log "${BOLD}Rotating Docker container logs${NC}"

CONTAINERS=$(docker ps --format '{{.Names}}' 2>/dev/null || true)
ROTATED=0

for container in $CONTAINERS; do
    LOG_PATH=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null || true)

    if [[ -z "$LOG_PATH" ]] || [[ ! -f "$LOG_PATH" ]]; then
        continue
    fi

    LOG_SIZE_MB=$(du -m "$LOG_PATH" 2>/dev/null | cut -f1)

    if [[ "$LOG_SIZE_MB" -gt "$MAX_LOG_SIZE_MB" ]]; then
        log "Truncating ${container} logs (${LOG_SIZE_MB}MB > ${MAX_LOG_SIZE_MB}MB)"
        truncate -s 0 "$LOG_PATH"
        ROTATED=$((ROTATED + 1))
    fi
done

success "Rotated ${ROTATED} container log(s)"

log "${BOLD}Cleaning old log files from ${LOG_DIR}${NC}"
DELETED=$(find "${LOG_DIR}" -name "*.log" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
success "Deleted ${DELETED} old log file(s)"

log "${BOLD}Cleaning old gzipped logs${NC}"
DELETED_GZ=$(find "${LOG_DIR}" -name "*.log.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
success "Deleted ${DELETED_GZ} old compressed log(s)"

log "${BOLD}Current Docker log sizes:${NC}"
for container in $CONTAINERS; do
    LOG_PATH=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null || true)
    if [[ -n "$LOG_PATH" ]] && [[ -f "$LOG_PATH" ]]; then
        SIZE=$(du -h "$LOG_PATH" 2>/dev/null | cut -f1)
        printf "  %-30s %s\n" "$container" "$SIZE"
    fi
done

echo ""
success "${BOLD}Log rotation complete${NC}"

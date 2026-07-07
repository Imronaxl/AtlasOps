#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/infra-monitor}"
CONTAINER="infra-postgres"

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

die() { error "$1"; exit 1; }

usage() {
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "Options:"
    echo "  backup_file   Path to backup file (.sql.gz). If omitted, lists available backups."
    echo ""
    echo "Examples:"
    echo "  $0                                    # List available backups"
    echo "  $0 /opt/backups/backup_20240101.sql.gz"
    exit 1
}

list_backups() {
    log "${BOLD}Available backups:${NC}"
    if ls "${BACKUP_DIR}"/backup_*.sql.gz 1>/dev/null 2>&1; then
        ls -lhS "${BACKUP_DIR}"/backup_*.sql.gz
    else
        warn "No backups found in ${BACKUP_DIR}"
    fi
    exit 0
}

if [[ $# -eq 0 ]]; then
    list_backups
fi

BACKUP_FILE="$1"

[[ -f "$BACKUP_FILE" ]] || die "Backup file not found: ${BACKUP_FILE}"

log "${BOLD}Restoring PostgreSQL from backup${NC}"
log "Backup file: ${BACKUP_FILE}"
log "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" || die "Container ${CONTAINER} is not running"

read -p "$(echo -e "${YELLOW}This will OVERWRITE the current database. Continue? [y/N]:${NC} ")" -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }

log "Creating safety backup of current state..."
SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec "${CONTAINER}" pg_dump \
    -U "${POSTGRES_USER:-infra_admin}" \
    -d "${POSTGRES_DB:-infra_monitor}" \
    --format=plain \
    --no-owner \
    --no-privileges | gzip -9 > "$SAFETY_BACKUP"

success "Safety backup created: ${SAFETY_BACKUP}"

log "Dropping and recreating database..."
docker exec "${CONTAINER}" psql \
    -U "${POSTGRES_USER:-infra_admin}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-infra_monitor}' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-infra_monitor};" \
    -c "CREATE DATABASE ${POSTGRES_DB:-infra_monitor} OWNER ${POSTGRES_USER:-infra_admin};" \
    2>/dev/null

log "Restoring database..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "${CONTAINER}" psql \
        -U "${POSTGRES_USER:-infra_admin}" \
        -d "${POSTGRES_DB:-infra_monitor}" \
        -q 2>/dev/null
else
    docker exec -i "${CONTAINER}" psql \
        -U "${POSTGRES_USER:-infra_admin}" \
        -d "${POSTGRES_DB:-infra_monitor}" \
        -q 2>/dev/null < "$BACKUP_FILE"
fi

log "Verifying restore..."
TABLE_COUNT=$(docker exec "${CONTAINER}" psql \
    -U "${POSTGRES_USER:-infra_admin}" \
    -d "${POSTGRES_DB:-infra_monitor}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    2>/dev/null | tr -d '[:space:]')

log "Tables restored: ${TABLE_COUNT}"

success "${BOLD}Restore complete${NC}"
log "Safety backup available at: ${SAFETY_BACKUP}"

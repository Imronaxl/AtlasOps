#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/infra-monitor}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER="infra-postgres"

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

die() { error "$1"; exit 1; }

cleanup() {
    if [[ -f "${BACKUP_DIR}/tmp_${TIMESTAMP}.sql" ]]; then
        rm -f "${BACKUP_DIR}/tmp_${TIMESTAMP}.sql"
    fi
}
trap cleanup EXIT

mkdir -p "${BACKUP_DIR}"

log "${BOLD}Starting PostgreSQL backup${NC}"

docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" || die "Container ${CONTAINER} is not running"

log "Creating dump..."
docker exec "${CONTAINER}" pg_dump \
    -U "${POSTGRES_USER:-infra_admin}" \
    -d "${POSTGRES_DB:-infra_monitor}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    > "${BACKUP_DIR}/tmp_${TIMESTAMP}.sql"

DUMP_SIZE=$(du -h "${BACKUP_DIR}/tmp_${TIMESTAMP}.sql" | cut -f1)
log "Dump size: ${DUMP_SIZE}"

log "Compressing..."
gzip -9 "${BACKUP_DIR}/tmp_${TIMESTAMP}.sql"
mv "${BACKUP_DIR}/tmp_${TIMESTAMP}.sql.gz" "${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

COMPRESSED_SIZE=$(du -h "${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz" | cut -f1)
success "Backup created: ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz (${COMPRESSED_SIZE})"

log "${BOLD}Rotating old backups (retention: ${RETENTION_DAYS} days)${NC}"
DELETED=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete -print | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
    log "Deleted ${DELETED} old backup(s)"
else
    log "No old backups to delete"
fi

log "${BOLD}Current backups:${NC}"
ls -lh "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null || warn "No backups found"

echo ""
success "${BOLD}Backup complete${NC}"

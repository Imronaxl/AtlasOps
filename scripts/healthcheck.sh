#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_TOTAL=0

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

check_container() {
    local name=$1
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "not_found")

    case "$status" in
        healthy)
            success "${name}: healthy"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            ;;
        unhealthy)
            error "${name}: unhealthy"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
            ;;
        starting)
            warn "${name}: starting"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            ;;
        *)
            error "${name}: ${status}"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
            ;;
    esac
}

check_endpoint() {
    local name=$1
    local url=$2
    local expected=${3:-200}
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

    if [[ "$http_code" -eq "$expected" ]]; then
        success "${name}: responding (HTTP ${http_code})"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        error "${name}: unexpected response (HTTP ${http_code}, expected ${expected})"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
}

check_disk() {
    local usage
    usage=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

    if [[ "$usage" -lt 80 ]]; then
        success "Disk usage: ${usage}%"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    elif [[ "$usage" -lt 90 ]]; then
        warn "Disk usage: ${usage}% (approaching limit)"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        error "Disk usage: ${usage}% (critical)"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
}

check_memory() {
    local usage
    usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))

    if [[ "$usage" -lt 80 ]]; then
        success "Memory usage: ${usage}%"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    elif [[ "$usage" -lt 90 ]]; then
        warn "Memory usage: ${usage}% (approaching limit)"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        error "Memory usage: ${usage}% (critical)"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
}

echo ""
log "${BOLD}Infrastructure Health Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "${BOLD}Container Health${NC}"
for container in infra-nginx infra-api infra-postgres infra-redis infra-prometheus infra-grafana infra-alertmanager infra-node-exporter infra-cadvisor; do
    check_container "$container"
done

echo ""
log "${BOLD}Endpoint Health${NC}"
check_endpoint "Nginx" "http://127.0.0.1:80/health" 200
check_endpoint "API" "http://127.0.0.1:8000/health" 200
check_endpoint "Prometheus" "http://127.0.0.1:9090/-/healthy" 200
check_endpoint "Grafana" "http://127.0.0.1:3000/api/health" 200
check_endpoint "Alertmanager" "http://127.0.0.1:9093/-/healthy" 200
check_endpoint "Node Exporter" "http://127.0.0.1:9100/metrics" 200

echo ""
log "${BOLD}System Health${NC}"
check_disk
check_memory

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log "${BOLD}Results: ${CHECKS_PASSED}/${CHECKS_TOTAL} passed${NC}"

if [[ $CHECKS_FAILED -eq 0 ]]; then
    success "${BOLD}All checks passed${NC}"
    exit 0
else
    error "${BOLD}${CHECKS_FAILED} check(s) failed${NC}"
    exit 1
fi

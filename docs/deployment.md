# Deployment Guide

## Prerequisites

- Docker Engine 24.0+
- Docker Compose v2.20+
- bash 5.0+
- curl, gzip

## Quick Start

```bash
git clone https://github.com/ImronAXL/infra-monitor.git
cd infra-monitor
cp .env.example .env
nano .env

make up
make healthcheck
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| POSTGRES_USER | Database user | infra_admin |
| POSTGRES_PASSWORD | Database password | (required) |
| POSTGRES_DB | Database name | infra_monitor |
| REDIS_PASSWORD | Redis password | (required) |
| GF_SECURITY_ADMIN_USER | Grafana admin user | admin |
| GF_SECURITY_ADMIN_PASSWORD | Grafana admin password | (required) |

## Deployment Methods

### Method 1: Makefile (Recommended)

```bash
make up
make down
make restart
make status
make logs
make healthcheck
```

### Method 2: Deploy Script (Zero-Downtime)

```bash
./scripts/deploy.sh
```

Features:
- Pre-flight validation
- Image pull and build
- Rolling deployment
- Health check verification
- Automatic cleanup

### Method 3: Docker Compose

```bash
docker compose up -d
docker compose ps
docker compose logs -f
```

## Backup and Restore

### Backup PostgreSQL

```bash
make backup

./scripts/backup.sh
```

Backups are stored in `${BACKUP_DIR:-/opt/backups/infra-monitor}`

### Restore PostgreSQL

```bash
./scripts/restore.sh

./scripts/restore.sh /opt/backups/infra-monitor/backup_20240101_120000.sql.gz
```

## Log Management

### Rotate Logs

```bash
make rotate-logs
```

Features:
- Truncates oversized container logs (>50MB)
- Deletes old log files (>30 days)
- Reports current log sizes

### Follow Logs

```bash
make logs
make logs-api
make logs-prometheus
```

## Cleanup

### Safe Cleanup (dry-run first)

```bash
./scripts/cleanup.sh --dry-run
./scripts/cleanup.sh
```

### Nuclear Option (removes everything)

```bash
make nuke
```

## Health Checks

```bash
make healthcheck
```

Checks:
- Container health status
- HTTP endpoint responses
- Disk usage
- Memory usage

## Systemd Installation

```bash
sudo cp systemd/infra-monitor.service /etc/systemd/system/

sudo mkdir -p /opt/infra-monitor
sudo cp -r . /opt/infra-monitor/
sudo cp .env.example /opt/infra-monitor/.env
sudo nano /opt/infra-monitor/.env

sudo systemctl daemon-reload
sudo systemctl enable infra-monitor
sudo systemctl start infra-monitor

sudo systemctl status infra-monitor
```

## Troubleshooting

### Container won't start

```bash
docker compose logs <service-name>
docker inspect <container-name>
```

### Port already in use

```bash
sudo lsof -i :<port>
```

### Permission denied

```bash
chmod +x scripts/*.sh

docker compose down -v
docker compose up -d
```

### Out of disk space

```bash
./scripts/cleanup.sh
docker system prune -a
```


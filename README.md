# Infrastructure Monitoring Platform

Production-like infrastructure monitoring stack demonstrating operational practices.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
│                           (nginx)                               │
│                            :80                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ /health │ │ /status │ │ /metrics│
         └────┬────┘ └────┬────┘ └────┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                      ┌────┴────┐
                      │   API   │
                      │(FastAPI)│
                      │  :8000  │
                      └────┬────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │PostgreSQL│ │  Redis  │ │Prometheus│
         │  :5432   │ │  :6379  │ │  :9090   │
         └─────────┘ └─────────┘ └─────┬────┘
                                       │
                              ┌────────┼────────┐
                              │        │        │
                              ▼        ▼        ▼
                        ┌─────────┐ ┌───────┐ ┌──────────┐
                        │ Grafana │ │Alert  │ │Node      │
                        │  :3000  │ │Manager│ │Exporter  │
                        └─────────┘ │ :9093 │ │  :9100   │
                                    └───────┘ └──────────┘
```

## Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Reverse Proxy | Nginx 1.27 | Load balancing, security headers, rate limiting |
| API Service | Python 3.12 + FastAPI | Application metrics and health endpoints |
| Database | PostgreSQL 16 | Persistent storage |
| Cache | Redis 7 | Session cache, rate limiting |
| Metrics | Prometheus | Time-series metrics collection |
| Dashboards | Grafana | Visualization and alerting |
| Alerting | Alertmanager | Alert routing and notification |
| System Metrics | Node Exporter | Host-level metrics |
| Container Metrics | cAdvisor | Container resource monitoring |

## Quick Start

```bash
git clone https://github.com/ImronAXL/infra-monitor.git
cd infra-monitor

cp .env.example .env
nano .env

make up
make status
make logs
```

## Monitoring

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin / (from .env) |
| Prometheus | http://localhost:9090 | — |
| Alertmanager | http://localhost:9093 | — |

### Dashboards

- **Infrastructure Monitoring** — CPU, Memory, Disk, Network, Containers, API metrics

### Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighCPUUsage | CPU > 80% for 5m | Warning |
| HighMemoryUsage | Memory > 90% for 5m | Warning |
| HighDiskUsage | Disk > 85% for 5m | Warning |
| ContainerDown | Container down for 1m | Critical |
| ContainerHighCPU | Container CPU > 80% for 5m | Warning |
| APILatencyHigh | p95 > 1s for 5m | Warning |
| HighErrorRate | 5xx > 5% for 5m | Critical |
| DiskSpaceLow | < 5GB free for 5m | Critical |

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/deploy.sh` | Zero-downtime deployment |
| `scripts/backup.sh` | PostgreSQL backup with compression |
| `scripts/restore.sh` | Database restore with safety backup |
| `scripts/healthcheck.sh` | Comprehensive health verification |
| `scripts/rotate_logs.sh` | Log rotation and cleanup |
| `scripts/cleanup.sh` | Docker resource cleanup |

## Directory Structure

```
infra-monitor/
├── docker-compose.yml
├── .env.example
├── Makefile
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── src/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── metrics.py
│   │   └── routes/
│   └── tests/
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── postgres/
│   └── init.sql
├── redis/
│   └── redis.conf
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   └── alertmanager/
├── scripts/
├── systemd/
├── .github/workflows/
└── docs/
```

## CI/CD Pipeline

```
Push/PR -> Lint -> Test -> Validate -> Build -> Security Scan
```

- **Lint**: ruff (Python), ShellCheck (Bash), yamllint (YAML)
- **Test**: pytest with coverage
- **Validate**: docker-compose config, Hadolint
- **Build**: Multi-stage Docker builds with layer caching
- **Security**: Trivy vulnerability scanner

## Roadmap

- [ ] Add Loki for log aggregation
- [ ] Add Tempo for distributed tracing
- [ ] Add MinIO for metrics long-term storage
- [ ] Kubernetes deployment manifests
- [ ] Terraform infrastructure provisioning
- [ ] E2E integration tests

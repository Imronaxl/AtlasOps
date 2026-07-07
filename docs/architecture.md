# Architecture

## Overview

Infrastructure Monitoring Platform is a production-like monitoring stack built with containerized services.

## Service Communication

```
                    ┌──────────────────────────────────────┐
                    │           infra-net (bridge)          │
                    │                                      │
  Internet ────────▶│  nginx ──▶ api ──┬──▶ postgres      │
                    │   :80      :8000  │     :5432        │
                    │                   ├──▶ redis         │
                    │                   │     :6379        │
                    │                   └──▶ prometheus    │
                    │                         :9090        │
                    │                                      │
                    │  grafana ──▶ prometheus               │
                    │   :3000      :9090                   │
                    │                                      │
                    │  alertmanager ◀── prometheus          │
                    │   :9093                               │
                    │                                      │
                    │  node-exporter ──▶ prometheus        │
                    │   :9100                               │
                    │                                      │
                    │  cadvisor ──▶ prometheus              │
                    │   :8080                               │
                    └──────────────────────────────────────┘
```

## Data Flow

### Metrics Pipeline

1. **Collection**: Prometheus scrapes targets every 15s
2. **Storage**: Time-series data stored in Prometheus TSDB
3. **Visualization**: Grafana queries Prometheus for dashboards
4. **Alerting**: Prometheus evaluates rules, sends to Alertmanager
5. **Notification**: Alertmanager routes alerts via webhook/email

### API Request Flow

```
Client → Nginx (rate limit, security headers) → FastAPI (metrics, logging) → Response
                                     ↓
                              Prometheus (request metrics)
```

## Design Decisions

### Why Nginx as Frontend?

- Battle-tested reverse proxy
- Rate limiting at edge protects API
- Security headers without application changes
- TLS termination point (add certbot for production)

### Why FastAPI?

- Async-native (handles concurrent connections efficiently)
- Auto-generated OpenAPI docs
- Type safety with Pydantic
- Prometheus instrumentation built-in

### Why Structured Logging?

- Machine-parseable logs
- Enables log aggregation (Loki, ELK)
- Correlation IDs across services
- Performance analysis via structured fields

## Network Security

- All services bind to `127.0.0.1` except internal bridge
- Nginx exposes only port 80 externally
- Metrics endpoints restricted to internal network
- Redis requires authentication
- PostgreSQL uses dedicated user with limited privileges

## Health Checks

Every container has a health check:

| Service | Check | Interval | Timeout |
|---------|-------|----------|---------|
| nginx | curl /health | 15s | 5s |
| api | curl /health | 15s | 5s |
| postgres | pg_isready | 10s | 5s |
| redis | redis-cli ping | 10s | 5s |
| prometheus | wget /-/healthy | 15s | 5s |
| grafana | curl /api/health | 15s | 5s |
| alertmanager | wget /-/healthy | 15s | 5s |
| node-exporter | wget /metrics | 15s | 5s |
| cadvisor | wget /healthz | 15s | 5s |

## Scaling Considerations

Current design is single-node. To scale:

1. **API**: Add replicas behind nginx upstream
2. **PostgreSQL**: Primary-replica setup with PgBouncer
3. **Redis**: Sentinel for HA, or Redis Cluster
4. **Prometheus**: Thanos for long-term storage and federation
5. **Grafana**: HA with shared database backend

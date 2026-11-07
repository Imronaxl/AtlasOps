"""Service catalog with live health from Prometheus.

The catalog (what runs in the stack) is static and mirrors docker-compose.yml.
Health and uptime are looked up on every request:

- health: the metric that answers "is it working" for each service, e.g.
  pg_up from postgres-exporter rather than whether the exporter itself is up;
- uptime: container_start_time_seconds from cAdvisor.
"""

import asyncio
import time
from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from src.metrics import UPSTREAM_ERRORS
from src.prometheus import Prometheus, PrometheusError

router = APIRouter(prefix="/api", tags=["services"])
log = structlog.get_logger(__name__)

ServiceStatus = Literal["healthy", "degraded", "unhealthy", "unknown"]


class ServiceInfo(BaseModel):
    name: str
    kind: str = Field(description="proxy, app, db, cache, monitor or exporter")
    status: ServiceStatus
    port: int
    image: str
    uptime_seconds: float | None = Field(description="Seconds since the container started")
    description: str
    depends_on: list[str]


class _Entry(BaseModel):
    name: str
    kind: str
    port: int
    image: str
    description: str
    depends_on: list[str] = []
    # PromQL that is 1 when the service works and 0 when it does not.
    health: str


CATALOG: list[_Entry] = [
    _Entry(
        name="nginx",
        kind="proxy",
        port=80,
        image="infra-nginx (nginx:1.27-alpine)",
        description="Reverse proxy with rate limiting and security headers.",
        depends_on=["api"],
        health="nginx_up",
    ),
    _Entry(
        name="api",
        kind="app",
        port=8000,
        image="infra-api (FastAPI)",
        description="This API: service health, metrics snapshots, incidents.",
        depends_on=["postgres", "redis", "prometheus"],
        health='up{job="api"}',
    ),
    _Entry(
        name="postgres",
        kind="db",
        port=5432,
        image="postgres:16-alpine",
        description="Stores incidents received from Alertmanager.",
        health="pg_up",
    ),
    _Entry(
        name="redis",
        kind="cache",
        port=6379,
        image="redis:7-alpine",
        description="Caches Prometheus query results for the API.",
        health="redis_up",
    ),
    _Entry(
        name="prometheus",
        kind="monitor",
        port=9090,
        image="prom/prometheus",
        description="Scrapes every exporter and evaluates alert rules.",
        depends_on=["node-exporter", "cadvisor", "api"],
        health='up{job="prometheus"}',
    ),
    _Entry(
        name="alertmanager",
        kind="monitor",
        port=9093,
        image="prom/alertmanager",
        description="Groups alerts and posts them to the API webhook.",
        depends_on=["prometheus"],
        health='up{job="alertmanager"}',
    ),
    _Entry(
        name="grafana",
        kind="monitor",
        port=3000,
        image="grafana/grafana",
        description="Dashboards over Prometheus.",
        depends_on=["prometheus"],
        health='up{job="grafana"}',
    ),
    _Entry(
        name="node-exporter",
        kind="exporter",
        port=9100,
        image="prom/node-exporter",
        description="Host CPU, memory, disk and network metrics.",
        health='up{job="node-exporter"}',
    ),
    _Entry(
        name="cadvisor",
        kind="exporter",
        port=8080,
        image="gcr.io/cadvisor/cadvisor",
        description="Per-container CPU, memory and I/O metrics.",
        health='up{job="cadvisor"}',
    ),
    _Entry(
        name="postgres-exporter",
        kind="exporter",
        port=9187,
        image="prometheuscommunity/postgres-exporter",
        description="PostgreSQL metrics.",
        depends_on=["postgres"],
        health='up{job="postgres"}',
    ),
    _Entry(
        name="redis-exporter",
        kind="exporter",
        port=9121,
        image="oliver006/redis_exporter",
        description="Redis metrics.",
        depends_on=["redis"],
        health='up{job="redis"}',
    ),
    _Entry(
        name="nginx-exporter",
        kind="exporter",
        port=9113,
        image="nginx/nginx-prometheus-exporter",
        description="Translates nginx stub_status into Prometheus metrics.",
        depends_on=["nginx"],
        health='up{job="nginx"}',
    ),
]


async def _live_services(prom: Prometheus) -> list[ServiceInfo]:
    health_results = await asyncio.gather(
        *(prom.query(f"max({e.health})") for e in CATALOG), return_exceptions=True
    )
    started = await prom.scalar_by('container_start_time_seconds{name=~"infra-.+"}', "name")
    now = time.time()

    services = []
    for entry, result in zip(CATALOG, health_results, strict=True):
        status: ServiceStatus = "unknown"
        if isinstance(result, list) and result:
            status = "healthy" if float(result[0]["value"][1]) >= 1 else "unhealthy"
        start = started.get(f"infra-{entry.name}")
        services.append(
            ServiceInfo(
                **entry.model_dump(exclude={"health"}),
                status=status,
                uptime_seconds=round(now - start, 1) if start else None,
            )
        )
    return services


async def _services_or_503(request: Request) -> list[ServiceInfo]:
    try:
        return await _live_services(request.app.state.prometheus)
    except PrometheusError as exc:
        UPSTREAM_ERRORS.labels("prometheus").inc()
        log.warning("prometheus_unavailable", error=str(exc))
        raise HTTPException(503, "Prometheus is unavailable") from exc


@router.get("/services", response_model=list[ServiceInfo])
async def list_services(request: Request) -> list[ServiceInfo]:
    return await _services_or_503(request)


@router.get("/services/{name}", response_model=ServiceInfo)
async def get_service(name: str, request: Request) -> ServiceInfo:
    if name not in {e.name for e in CATALOG}:
        raise HTTPException(404, f"Unknown service {name!r}")
    services = await _services_or_503(request)
    return next(s for s in services if s.name == name)

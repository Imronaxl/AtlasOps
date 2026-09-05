"""Service registry.

Stores the list of monitored services, their current status and metadata.
In production, this data would come from the database (services table).
For demo purposes (and to let the UI work without running Postgres),
we return a static snapshot — handy for portfolio demos.
"""

from datetime import datetime, timezone
from typing import Literal

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.config import get_settings

router = APIRouter(prefix="/api", tags=["services"])
logger = structlog.get_logger()


ServiceStatus = Literal["healthy", "degraded", "unhealthy", "unknown"]


class ServiceInfo(BaseModel):
    """Description of a single infrastructure service."""

    name: str = Field(..., description="Container / service name")
    kind: str = Field(..., description="Category: proxy, app, db, cache, monitor, exporter")
    status: ServiceStatus = Field(..., description="Current health-check status")
    port: int = Field(..., description="Port exposed by the service")
    image: str = Field(..., description="Docker image")
    uptime_seconds: float = Field(..., description="How long the service has been running")
    description: str = Field("", description="What this service does, in plain language")
    depends_on: list[str] = Field(default_factory=list, description="Services this one depends on")


# Initial infrastructure snapshot.
# Ports and images mirror docker-compose.yml so that the UI and compose
# always speak about the same thing — this reduces confusion during reviews.
_DEFAULT_SERVICES: list[ServiceInfo] = [
    ServiceInfo(
        name="nginx",
        kind="proxy",
        status="healthy",
        port=80,
        image="nginx:1.27-alpine (custom)",
        uptime_seconds=3624.5,
        description="Reverse proxy: TLS termination, rate-limit, security headers.",
        depends_on=["api"],
    ),
    ServiceInfo(
        name="api",
        kind="app",
        status="healthy",
        port=8000,
        image="infra-api:latest (FastAPI + uvicorn)",
        uptime_seconds=3623.1,
        description="Main application: /health, /status, /metrics. Async + structlog.",
        depends_on=["postgres", "redis"],
    ),
    ServiceInfo(
        name="postgres",
        kind="db",
        status="healthy",
        port=5432,
        image="postgres:16-alpine",
        uptime_seconds=3625.0,
        description="Stores services and incidents. pgcrypto + updated_at triggers.",
        depends_on=[],
    ),
    ServiceInfo(
        name="redis",
        kind="cache",
        status="healthy",
        port=6379,
        image="redis:7-alpine",
        uptime_seconds=3624.9,
        description="In-memory cache and rate-limiter. AOF everysec, maxmemory 256mb.",
        depends_on=[],
    ),
    ServiceInfo(
        name="prometheus",
        kind="monitor",
        status="healthy",
        port=9090,
        image="prom/prometheus:latest",
        uptime_seconds=3623.7,
        description="Time-series DB for metrics. Scrapes exporters every 15s.",
        depends_on=["node-exporter", "cadvisor", "api"],
    ),
    ServiceInfo(
        name="grafana",
        kind="monitor",
        status="healthy",
        port=3000,
        image="grafana/grafana:latest",
        uptime_seconds=3622.4,
        description="Dashboards on top of Prometheus. YAML-provisioned.",
        depends_on=["prometheus"],
    ),
    ServiceInfo(
        name="alertmanager",
        kind="monitor",
        status="degraded",
        port=9093,
        image="prom/alertmanager:latest",
        uptime_seconds=3621.0,
        description="Routes alerts from Prometheus to webhook/email.",
        depends_on=["prometheus"],
    ),
    ServiceInfo(
        name="node-exporter",
        kind="exporter",
        status="healthy",
        port=9100,
        image="prom/node-exporter:latest",
        uptime_seconds=3624.0,
        description="Exports host CPU/RAM/Disk/Net metrics to Prometheus.",
        depends_on=[],
    ),
    ServiceInfo(
        name="cadvisor",
        kind="exporter",
        status="healthy",
        port=8080,
        image="gcr.io/cadvisor/cadvisor:latest",
        uptime_seconds=3623.5,
        description="Exports per-container metrics: CPU/RAM/IO of each container.",
        depends_on=[],
    ),
]


@router.get("/services", response_model=list[ServiceInfo])
async def list_services():
    """Return all services from the registry.

    Useful for the dashboard summary and the status table on the frontend.
    We log the call here so that every public endpoint has explicit logging,
    not only the middleware-level one.
    """
    settings = get_settings()
    logger.info("services_list", env=settings.environment, count=len(_DEFAULT_SERVICES))
    return _DEFAULT_SERVICES


@router.get("/services/{name}", response_model=ServiceInfo)
async def get_service(name: str):
    """Return a single service by name. 404 if not found."""
    for s in _DEFAULT_SERVICES:
        if s.name == name:
            return s
    logger.warning("service_not_found", name=name)
    raise HTTPException(status_code=404, detail=f"service '{name}' not found")


@router.get("/services/{name}/health")
async def service_health(name: str):
    """Simplified health-check for a specific service.

    Returns only the fields needed for a UI status-badge:
    name, status, timestamp. No extra payload.
    """
    for s in _DEFAULT_SERVICES:
        if s.name == name:
            return {
                "name": s.name,
                "status": s.status,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
    raise HTTPException(status_code=404, detail=f"service '{name}' not found")

from datetime import datetime, timedelta, timezone
from typing import Literal

import structlog
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["incidents"])
logger = structlog.get_logger()


Severity = Literal["critical", "warning", "info"]


class Incident(BaseModel):
    id: int
    service: str = Field(..., description="Service name")
    severity: Severity
    title: str
    description: str
    created_at: str = Field(..., description="ISO-8601 UTC")
    resolved_at: str | None = Field(None, description="ISO-8601 UTC or null if still active")
    resolved: bool
    duration_seconds: int | None = Field(None, description="Duration if resolved")


_NOW = datetime.now(timezone.utc)


def _ts(minutes_ago: int) -> str:
    return (_NOW - timedelta(minutes=minutes_ago)).isoformat()


_DEFAULT_INCIDENTS: list[Incident] = [
    Incident(
        id=1,
        service="api",
        severity="critical",
        title="HighErrorRate: 5xx > 5% for 5m",
        description=(
            "Share of 5xx responses on /metrics grew to 7.4%. Root cause: a "
            "race condition when reconnecting to postgres after a restart. "
            "Fix: pgbouncer in the queue."
        ),
        created_at=_ts(180),
        resolved_at=_ts(165),
        resolved=True,
        duration_seconds=900,
    ),
    Incident(
        id=2,
        service="node-exporter",
        severity="warning",
        title="HighCPUUsage: CPU > 80% for 5m",
        description="cadvisor scrape consumed 86% CPU with a large number of containers.",
        created_at=_ts(120),
        resolved_at=_ts(95),
        resolved=True,
        duration_seconds=1500,
    ),
    Incident(
        id=3,
        service="postgres",
        severity="warning",
        title="HighDiskUsage: Disk > 85% for 5m",
        description=(
            "/var/lib/postgresql/data at 87%. Fix: VACUUM FULL + rotation "
            "of old log partitions via scripts/rotate_logs.sh."
        ),
        created_at=_ts(60),
        resolved_at=None,
        resolved=False,
        duration_seconds=None,
    ),
    Incident(
        id=4,
        service="alertmanager",
        severity="warning",
        title="AlertmanagerSendFailed",
        description="Failed to send a notification to webhook. Retry every 30s.",
        created_at=_ts(25),
        resolved_at=None,
        resolved=False,
        duration_seconds=None,
    ),
    Incident(
        id=5,
        service="api",
        severity="info",
        title="Deploy completed: v1.4.2",
        description="Zero-downtime deploy via scripts/deploy.sh. Roll-forward successful.",
        created_at=_ts(10),
        resolved_at=_ts(9),
        resolved=True,
        duration_seconds=60,
    ),
]


@router.get("/incidents", response_model=list[Incident])
async def list_incidents(
    severity: Severity | None = Query(None, description="Filter by severity"),
    resolved: bool | None = Query(None, description="Filter: resolved/active"),
    limit: int = Query(50, ge=1, le=200, description="How many records to return"),
):
    items = _DEFAULT_INCIDENTS
    if severity is not None:
        items = [i for i in items if i.severity == severity]
    if resolved is not None:
        items = [i for i in items if i.resolved == resolved]
    items = sorted(items, key=lambda i: i.created_at, reverse=True)[:limit]
    logger.info("incidents_list", severity=severity, resolved=resolved, returned=len(items))
    return items


@router.get("/incidents/active", response_model=list[Incident])
async def active_incidents():
    items = [i for i in _DEFAULT_INCIDENTS if not i.resolved]
    logger.info("incidents_active", count=len(items))
    return items

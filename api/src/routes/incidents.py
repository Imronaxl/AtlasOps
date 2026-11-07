"""Incidents: alerts from Alertmanager, stored in PostgreSQL."""

import hmac
from datetime import datetime
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from src.metrics import ALERTS_RECEIVED

router = APIRouter(prefix="/api", tags=["incidents"])
log = structlog.get_logger(__name__)

Severity = Literal["critical", "warning", "info"]


class Incident(BaseModel):
    id: int
    service: str
    severity: str
    title: str
    description: str
    created_at: datetime
    resolved_at: datetime | None
    resolved: bool
    duration_seconds: int | None = Field(description="Set once the alert has resolved")


class AlertmanagerAlert(BaseModel):
    status: Literal["firing", "resolved"]
    labels: dict[str, str]
    annotations: dict[str, str] = {}
    startsAt: str  # noqa: N815 - Alertmanager field names
    endsAt: str = ""  # noqa: N815
    fingerprint: str


class AlertmanagerWebhook(BaseModel):
    """The payload Alertmanager posts to webhook receivers (version 4)."""

    version: str
    status: str
    alerts: list[AlertmanagerAlert]


def _to_incident(row: Any) -> Incident:
    ends = row["ends_at"]
    return Incident(
        id=row["id"],
        service=row["service"],
        severity=row["severity"],
        title=row["summary"] or row["alertname"],
        description=row["description"],
        created_at=row["starts_at"],
        resolved_at=ends,
        resolved=ends is not None,
        duration_seconds=int((ends - row["starts_at"]).total_seconds()) if ends else None,
    )


@router.get("/incidents", response_model=list[Incident])
async def list_incidents(
    request: Request,
    severity: Severity | None = Query(None),
    resolved: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[Incident]:
    rows = await request.app.state.incidents.list(severity, resolved, limit)
    return [_to_incident(r) for r in rows]


@router.get("/incidents/active", response_model=list[Incident])
async def active_incidents(request: Request) -> list[Incident]:
    rows = await request.app.state.incidents.list(None, False, 200)
    return [_to_incident(r) for r in rows]


@router.post("/alerts", status_code=202, include_in_schema=False)
async def alertmanager_webhook(
    payload: AlertmanagerWebhook,
    request: Request,
    authorization: str = Header(""),
) -> dict[str, int]:
    """Receiver for Alertmanager (see monitoring/alertmanager/config.yml)."""
    token = request.app.state.settings.alert_webhook_token
    if token and not hmac.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(401, "invalid webhook token")

    stored = await request.app.state.incidents.upsert([a.model_dump() for a in payload.alerts])
    for a in payload.alerts:
        ALERTS_RECEIVED.labels(a.status).inc()
    log.info("alerts_received", count=stored, group_status=payload.status)
    return {"stored": stored}

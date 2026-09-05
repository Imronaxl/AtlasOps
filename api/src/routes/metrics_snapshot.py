"""Metrics snapshot for the dashboard.

Prometheus exposes raw metrics in text format — parsing them on the
frontend is awkward. So here we return an already-digested snapshot:
numbers ready to be drawn with Recharts.

In production the data would come from prometheus_client or an HTTP
call to the Prometheus API. For the demo we synthesize it, but with
realistic dynamics (sin wave + noise) so the charts look alive.
"""

import math
import random
import time
from typing import Literal

import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["metrics"])
logger = structlog.get_logger()


MetricKind = Literal["cpu", "memory", "requests", "latency", "errors"]


class MetricPoint(BaseModel):
    """A single point of a time series."""

    t: int = Field(..., description="Unix seconds")
    value: float


class MetricSeries(BaseModel):
    """A single metric series: name + points."""

    name: str
    unit: str
    points: list[MetricPoint]


class MetricsSnapshot(BaseModel):
    """Snapshot of all metrics needed by the dashboard."""

    generated_at: int
    series: list[MetricSeries]
    # Current KPI values for the top dashboard cards.
    current: dict[str, float]


def _wave(base: float, amplitude: float, period: int, now: int, count: int) -> list[MetricPoint]:
    """Sin wave with light noise — a realistic-looking live metric."""
    points = []
    for i in range(count):
        t = now - (count - 1 - i) * 60  # one minute between points
        wave = math.sin(2 * math.pi * (now - t) / period) * amplitude
        noise = random.uniform(-amplitude * 0.1, amplitude * 0.1)
        value = max(0.0, base + wave + noise)
        points.append(MetricPoint(t=t, value=round(value, 2)))
    return points


@router.get("/metrics/snapshot", response_model=MetricsSnapshot)
async def metrics_snapshot():
    """Return a metrics snapshot for the last hour (60 points, 60s step).

    The structure is the same for every series so the frontend can render
    them all with a single component, without separate hooks per chart.
    """
    now = int(time.time())
    count = 60

    cpu = _wave(base=42.0, amplitude=15.0, period=1800, now=now, count=count)
    memory = _wave(base=58.0, amplitude=10.0, period=2400, now=now, count=count)
    requests = _wave(base=120.0, amplitude=40.0, period=900, now=now, count=count)
    latency = _wave(base=85.0, amplitude=25.0, period=1200, now=now, count=count)
    errors = _wave(base=0.6, amplitude=0.4, period=1500, now=now, count=count)

    snapshot = MetricsSnapshot(
        generated_at=now,
        series=[
            MetricSeries(name="cpu", unit="%", points=cpu),
            MetricSeries(name="memory", unit="%", points=memory),
            MetricSeries(name="requests", unit="rps", points=requests),
            MetricSeries(name="latency", unit="ms", points=latency),
            MetricSeries(name="errors", unit="%", points=errors),
        ],
        current={
            "cpu": cpu[-1].value,
            "memory": memory[-1].value,
            "requests": requests[-1].value,
            "latency": latency[-1].value,
            "errors": errors[-1].value,
            "uptime_seconds": 3624.5,
        },
    )
    logger.info("metrics_snapshot_served", series=len(snapshot.series))
    return snapshot

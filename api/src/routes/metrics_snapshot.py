"""Last hour of key metrics for the dashboard, read from Prometheus."""

import asyncio
import time

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from src.metrics import UPSTREAM_ERRORS
from src.prometheus import PrometheusError

router = APIRouter(prefix="/api", tags=["metrics"])
log = structlog.get_logger(__name__)

WINDOW = 3600
STEP = 60

# name -> (unit, PromQL)
SERIES: dict[str, tuple[str, str]] = {
    "cpu": ("%", '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[2m])))'),
    "memory": ("%", "100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)"),
    "requests": ("rps", 'sum(rate(http_requests_total{job="api"}[2m]))'),
    "latency": (
        "ms",
        "1000 * histogram_quantile(0.95, sum by (le) ("
        'rate(http_request_duration_seconds_bucket{job="api"}[2m])))',
    ),
    "errors": (
        "%",
        '100 * sum(rate(http_requests_total{job="api",status=~"5.."}[2m]))'
        ' / clamp_min(sum(rate(http_requests_total{job="api"}[2m])), 1e-9)',
    ),
}


class MetricPoint(BaseModel):
    t: int = Field(description="Unix seconds")
    value: float


class MetricSeries(BaseModel):
    name: str
    unit: str
    points: list[MetricPoint]


class MetricsSnapshot(BaseModel):
    generated_at: int
    series: list[MetricSeries]
    current: dict[str, float]


@router.get("/metrics/snapshot", response_model=MetricsSnapshot)
async def metrics_snapshot(request: Request) -> MetricsSnapshot:
    prom = request.app.state.prometheus
    # Align to the step so the Redis cache key is stable within a minute.
    end = int(time.time()) // STEP * STEP
    try:
        results = await asyncio.gather(
            *(prom.query_range(expr, end - WINDOW, end, STEP) for _, expr in SERIES.values())
        )
        uptime = await prom.query('time() - process_start_time_seconds{job="api"}')
    except PrometheusError as exc:
        UPSTREAM_ERRORS.labels("prometheus").inc()
        raise HTTPException(503, "Prometheus is unavailable") from exc

    series, current = [], {}
    for (name, (unit, _)), result in zip(SERIES.items(), results, strict=True):
        values = result[0]["values"] if result else []
        points = [
            MetricPoint(t=int(t), value=round(float(v), 2))
            for t, v in values
            if v not in ("NaN", "+Inf", "-Inf")
        ]
        series.append(MetricSeries(name=name, unit=unit, points=points))
        current[name] = points[-1].value if points else 0.0
    current["uptime_seconds"] = round(float(uptime[0]["value"][1]), 1) if uptime else 0.0

    return MetricsSnapshot(generated_at=end, series=series, current=current)

"""Static description of the stack, used by the dashboard's architecture view."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["architecture"])


class ArchNode(BaseModel):
    id: str
    label: str
    kind: str = Field(description="external, proxy, app, db, cache, monitor or exporter")
    port: int | None = None
    description: str = ""
    # Grid position for the diagram: x from 1 to 11, y from -1 (bottom) to 3 (top).
    x: int
    y: int


class ArchEdge(BaseModel):
    source: str
    target: str
    label: str = ""
    kind: str = Field("http", description="http, scrape or depend")


class Architecture(BaseModel):
    nodes: list[ArchNode]
    edges: list[ArchEdge]
    legend: dict[str, str]


def _n(id: str, label: str, kind: str, port: int | None, description: str, x: int, y: int) -> ArchNode:
    return ArchNode(id=id, label=label, kind=kind, port=port, description=description, x=x, y=y)


ARCHITECTURE = Architecture(
    nodes=[
        _n("internet", "Internet", "external", None, "User traffic.", 1, 1),
        _n("nginx", "nginx", "proxy", 80, "Reverse proxy: rate limiting, security headers, gzip.", 3, 1),
        _n("api", "API", "app", 8000, "FastAPI: reads Prometheus over PromQL, stores incidents.", 5, 1),
        _n("postgres", "PostgreSQL", "db", 5432, "Incidents received from Alertmanager.", 7, 2),
        _n("redis", "Redis", "cache", 6379, "Short-lived cache of Prometheus query results.", 7, 0),
        _n("prometheus", "Prometheus", "monitor", 9090, "Scrapes all targets, evaluates alert rules.", 9, 1),
        _n("grafana", "Grafana", "monitor", 3000, "Provisioned dashboards over Prometheus.", 11, 2),
        _n(
            "alertmanager", "Alertmanager", "monitor", 9093, "Groups alerts and posts them to the API.", 11, 0
        ),
        _n("node-exporter", "node-exporter", "exporter", 9100, "Host CPU, memory, disk, network.", 9, 3),
        _n("cadvisor", "cAdvisor", "exporter", 8080, "Per-container CPU, memory, I/O.", 9, -1),
        _n("postgres-exporter", "postgres-exporter", "exporter", 9187, "PostgreSQL metrics, pg_up.", 7, 3),
        _n("redis-exporter", "redis-exporter", "exporter", 9121, "Redis metrics, redis_up.", 7, -1),
        _n("nginx-exporter", "nginx-exporter", "exporter", 9113, "nginx stub_status as metrics.", 3, -1),
    ],
    edges=[
        ArchEdge(source="internet", target="nginx", label="HTTP :80", kind="http"),
        ArchEdge(source="nginx", target="api", label="proxy_pass", kind="http"),
        ArchEdge(source="api", target="postgres", label="asyncpg", kind="depend"),
        ArchEdge(source="api", target="redis", label="cache", kind="depend"),
        ArchEdge(source="prometheus", target="api", label="/metrics, PromQL", kind="scrape"),
        ArchEdge(source="prometheus", target="node-exporter", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="cadvisor", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="postgres-exporter", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="redis-exporter", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="nginx-exporter", label="/metrics", kind="scrape"),
        ArchEdge(source="postgres-exporter", target="postgres", label="SQL", kind="depend"),
        ArchEdge(source="redis-exporter", target="redis", label="INFO", kind="depend"),
        ArchEdge(source="nginx-exporter", target="nginx", label="stub_status", kind="depend"),
        ArchEdge(source="prometheus", target="alertmanager", label="alerts", kind="http"),
        ArchEdge(source="alertmanager", target="api", label="webhook", kind="http"),
        ArchEdge(source="grafana", target="prometheus", label="query", kind="http"),
    ],
    legend={
        "external": "External traffic",
        "proxy": "Reverse proxy",
        "app": "Application (FastAPI)",
        "db": "Data storage",
        "cache": "Cache",
        "monitor": "Monitoring and alerting",
        "exporter": "Metrics exporter",
        "http": "HTTP call",
        "scrape": "Metrics scrape (pull)",
        "depend": "Runtime dependency",
    },
)


@router.get("/architecture", response_model=Architecture)
async def get_architecture() -> Architecture:
    return ARCHITECTURE

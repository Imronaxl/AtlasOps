import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["architecture"])
logger = structlog.get_logger()


class ArchNode(BaseModel):
    id: str
    label: str
    kind: str = Field(..., description="proxy | app | db | cache | monitor | exporter | external")
    port: int | None = None
    description: str = ""
    x: int
    y: int


class ArchEdge(BaseModel):
    source: str
    target: str
    label: str = ""
    kind: str = "http"


class Architecture(BaseModel):
    nodes: list[ArchNode]
    edges: list[ArchEdge]
    legend: dict[str, str] = Field(
        default_factory=dict,
        description="kind -> human description",
    )


_ARCH = Architecture(
    nodes=[
        ArchNode(
            id="internet",
            label="Internet",
            kind="external",
            port=None,
            description="External user traffic.",
            x=1,
            y=1,
        ),
        ArchNode(
            id="nginx",
            label="nginx",
            kind="proxy",
            port=80,
            description="Reverse proxy: rate-limit, security headers, gzip.",
            x=3,
            y=1,
        ),
        ArchNode(
            id="api",
            label="FastAPI",
            kind="app",
            port=8000,
            description="Application: /health, /status, /metrics + middleware.",
            x=5,
            y=1,
        ),
        ArchNode(
            id="postgres",
            label="PostgreSQL",
            kind="db",
            port=5432,
            description="Storage: services, incidents. Async driver asyncpg.",
            x=7,
            y=2,
        ),
        ArchNode(
            id="redis",
            label="Redis",
            kind="cache",
            port=6379,
            description="Cache and rate-limiter. AOF, maxmemory 256mb, LRU eviction.",
            x=7,
            y=0,
        ),
        ArchNode(
            id="prometheus",
            label="Prometheus",
            kind="monitor",
            port=9090,
            description="Time-series DB. Scrapes exporters every 15s.",
            x=9,
            y=1,
        ),
        ArchNode(
            id="grafana",
            label="Grafana",
            kind="monitor",
            port=3000,
            description="Dashboards on top of Prometheus. YAML-provisioned.",
            x=11,
            y=2,
        ),
        ArchNode(
            id="alertmanager",
            label="Alertmanager",
            kind="monitor",
            port=9093,
            description="Alert routing: webhook / email.",
            x=11,
            y=0,
        ),
        ArchNode(
            id="node-exporter",
            label="node_exporter",
            kind="exporter",
            port=9100,
            description="Host metrics: CPU, RAM, disk, net.",
            x=9,
            y=3,
        ),
        ArchNode(
            id="cadvisor",
            label="cAdvisor",
            kind="exporter",
            port=8080,
            description="Container metrics: per-container CPU/RAM/IO.",
            x=9,
            y=-1,
        ),
    ],
    edges=[
        ArchEdge(source="internet", target="nginx", label="HTTP :80", kind="http"),
        ArchEdge(source="nginx", target="api", label="proxy_pass", kind="http"),
        ArchEdge(source="api", target="postgres", label="asyncpg", kind="depend"),
        ArchEdge(source="api", target="redis", label="redis-py", kind="depend"),
        ArchEdge(source="prometheus", target="api", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="node-exporter", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="cadvisor", label="/metrics", kind="scrape"),
        ArchEdge(source="prometheus", target="alertmanager", label="alerts", kind="http"),
        ArchEdge(source="grafana", target="prometheus", label="query", kind="http"),
    ],
    legend={
        "external": "External traffic / users",
        "proxy": "Reverse proxy, edge layer",
        "app": "Application (FastAPI)",
        "db": "Data storage",
        "cache": "Cache / rate-limiter",
        "monitor": "Monitoring and alerting",
        "exporter": "Metrics exporter",
        "http": "HTTP call",
        "scrape": "Metrics scraping (pull)",
        "depend": "Hard runtime dependency",
    },
)


@router.get("/architecture", response_model=Architecture)
async def get_architecture():
    logger.info("architecture_served", nodes=len(_ARCH.nodes), edges=len(_ARCH.edges))
    return _ARCH

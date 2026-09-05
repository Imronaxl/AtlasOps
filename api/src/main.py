import logging
import time

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest

from src.config import get_settings
from src.metrics import INACTIVE_CONNECTIONS, REQUEST_COUNT, REQUEST_LATENCY
from src.routes.architecture import router as architecture_router
from src.routes.health import router as health_router
from src.routes.incidents import router as incidents_router
from src.routes.metrics_snapshot import router as metrics_snapshot_router
from src.routes.runbook import router as runbook_router
from src.routes.services import router as services_router
from src.routes.status import router as status_router


def configure_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


configure_logging()
logger = structlog.get_logger()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(status_router)
app.include_router(services_router)
app.include_router(incidents_router)
app.include_router(architecture_router)
app.include_router(metrics_snapshot_router)
app.include_router(runbook_router)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code,
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path,
    ).observe(duration)

    INACTIVE_CONNECTIONS.inc()

    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )

    return response


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return generate_latest()

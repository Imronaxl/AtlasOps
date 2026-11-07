import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import asyncpg
import httpx
import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from redis.asyncio import Redis

from src.config import Settings, get_settings
from src.incidents_store import IncidentStore
from src.metrics import IN_FLIGHT, REQUEST_COUNT, REQUEST_LATENCY, registry
from src.prometheus import Prometheus
from src.routes.architecture import router as architecture_router
from src.routes.health import router as health_router
from src.routes.incidents import router as incidents_router
from src.routes.metrics_snapshot import router as metrics_snapshot_router
from src.routes.runbook import router as runbook_router
from src.routes.services import router as services_router

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    cache_logger_on_first_use=True,
)
log = structlog.get_logger()


def create_app(
    settings: Settings | None = None,
    redis_factory: Callable[[], Redis] | None = None,
    http_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        pool = await asyncpg.create_pool(settings.postgres_dsn, min_size=1, max_size=5)
        redis = (
            redis_factory() if redis_factory else Redis.from_url(settings.redis_url, decode_responses=True)
        )
        http = httpx.AsyncClient(base_url=settings.prometheus_url, timeout=5.0, transport=http_transport)

        app.state.settings = settings
        app.state.pool = pool
        app.state.redis = redis
        app.state.http = http
        app.state.prometheus = Prometheus(http, redis, settings.query_cache_ttl)
        app.state.incidents = IncidentStore(pool)
        log.info("startup_complete", prometheus=settings.prometheus_url)
        try:
            yield
        finally:
            await http.aclose()
            await redis.aclose()
            await pool.close()

    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
    if settings.cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET"])

    for router in (
        health_router,
        services_router,
        incidents_router,
        metrics_snapshot_router,
        architecture_router,
        runbook_router,
    ):
        app.include_router(router)

    @app.middleware("http")
    async def observe(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start = time.perf_counter()
        IN_FLIGHT.inc()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        finally:
            IN_FLIGHT.dec()
            duration = time.perf_counter() - start
            # Label by route template, not the raw path, to keep cardinality bounded.
            route = request.scope.get("route")
            endpoint = getattr(route, "path", "unmatched")
            REQUEST_COUNT.labels(request.method, endpoint, str(status)).inc()
            REQUEST_LATENCY.labels(request.method, endpoint).observe(duration)
            if endpoint not in ("/health", "/metrics"):
                log.info(
                    "request",
                    method=request.method,
                    path=request.url.path,
                    status=status,
                    duration_ms=round(duration * 1000, 2),
                )

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> Response:
        return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)

    return app

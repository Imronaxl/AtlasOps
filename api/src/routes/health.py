import time
from datetime import UTC, datetime

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])

_started = time.monotonic()


async def _check(request: Request) -> dict[str, dict[str, object]]:
    state = request.app.state
    results: dict[str, dict[str, object]] = {}

    async def run(name: str, coro) -> None:  # type: ignore[no-untyped-def]
        start = time.perf_counter()
        try:
            await coro
            results[name] = {"status": "ok"}
        except Exception as exc:
            results[name] = {"status": "error", "error": type(exc).__name__}
        results[name]["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)

    async def pg() -> None:
        async with state.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")

    async def prom() -> None:
        resp = await state.http.get("/-/ready")
        resp.raise_for_status()

    await run("postgres", pg())
    await run("redis", state.redis.ping())
    await run("prometheus", prom())
    return results


@router.get("/health")
async def health() -> dict[str, object]:
    """Liveness: the process is up. Dependencies are checked by /ready."""
    return {"status": "healthy", "uptime_seconds": round(time.monotonic() - _started, 1)}


@router.get("/ready")
async def ready(request: Request) -> JSONResponse:
    """Readiness: PostgreSQL, Redis and Prometheus answer."""
    checks = await _check(request)
    ok = all(c["status"] == "ok" for c in checks.values())
    return JSONResponse({"status": "ready" if ok else "not_ready", "checks": checks}, 200 if ok else 503)


@router.get("/status")
async def status(request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.api_env,
        "uptime_seconds": round(time.monotonic() - _started, 1),
        "timestamp": datetime.now(UTC).isoformat(),
        "components": await _check(request),
    }

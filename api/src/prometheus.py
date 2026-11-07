"""Small client for the Prometheus HTTP API with a Redis-backed cache."""

import json
from typing import Any

import httpx
import structlog
from redis.asyncio import Redis

log = structlog.get_logger(__name__)


class PrometheusError(RuntimeError):
    pass


class Prometheus:
    def __init__(self, http: httpx.AsyncClient, cache: Redis | None, ttl: int) -> None:
        self._http = http
        self._cache = cache
        self._ttl = ttl

    async def query(self, expr: str) -> list[dict[str, Any]]:
        """Instant query; returns the vector result."""
        data = await self._get("/api/v1/query", {"query": expr})
        return data["result"]  # type: ignore[no-any-return]

    async def query_range(self, expr: str, start: int, end: int, step: int) -> list[dict[str, Any]]:
        data = await self._get(
            "/api/v1/query_range", {"query": expr, "start": start, "end": end, "step": step}
        )
        return data["result"]  # type: ignore[no-any-return]

    async def scalar_by(self, expr: str, label: str) -> dict[str, float]:
        """Runs an instant query and maps `label` to the sample value."""
        return {r["metric"].get(label, ""): float(r["value"][1]) for r in await self.query(expr)}

    async def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        key = "prom:" + path + ":" + json.dumps(params, sort_keys=True)
        if self._cache is not None:
            try:
                cached = await self._cache.get(key)
                if cached:
                    return json.loads(cached)  # type: ignore[no-any-return]
            except Exception:  # a cache outage must not break the API
                log.warning("cache_read_failed", exc_info=True)

        try:
            resp = await self._http.get(path, params=params)
            resp.raise_for_status()
            body = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise PrometheusError(f"Prometheus request failed: {exc}") from exc
        if body.get("status") != "success":
            raise PrometheusError(body.get("error", "unknown Prometheus error"))

        if self._cache is not None:
            try:
                await self._cache.set(key, json.dumps(body["data"]), ex=self._ttl)
            except Exception:
                log.warning("cache_write_failed", exc_info=True)
        return body["data"]  # type: ignore[no-any-return]

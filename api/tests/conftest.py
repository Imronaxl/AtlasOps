import json
import os
from collections.abc import Callable, Iterator
from typing import Any

import asyncpg
import fakeredis
import httpx
import pytest
from fastapi.testclient import TestClient

from src.config import Settings
from src.main import create_app

DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
SCHEMA = os.path.join(os.path.dirname(__file__), "..", "..", "postgres", "init.sql")

if not DATABASE_URL:
    pytest.skip("TEST_DATABASE_URL is not set", allow_module_level=True)


class FakePrometheus:
    """Answers the Prometheus HTTP API from a dict of PromQL -> result."""

    def __init__(self) -> None:
        self.instant: dict[str, list[dict[str, Any]]] = {}
        self.ranges: dict[str, list[dict[str, Any]]] = {}
        self.calls = 0
        self.down = False

    def vector(self, expr: str, *samples: tuple[dict[str, str], float]) -> None:
        self.instant[expr] = [{"metric": m, "value": [0, str(v)]} for m, v in samples]

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.calls += 1
        if self.down:
            return httpx.Response(503, text="down")
        if request.url.path == "/-/ready":
            return httpx.Response(200, text="ready")
        query = request.url.params["query"]
        if request.url.path == "/api/v1/query_range":
            result = self.ranges.get(query, [])
            kind = "matrix"
        else:
            result = self.instant.get(query, [])
            kind = "vector"
        body = {"status": "success", "data": {"resultType": kind, "result": result}}
        return httpx.Response(200, text=json.dumps(body))


@pytest.fixture
def prom() -> FakePrometheus:
    return FakePrometheus()


@pytest.fixture
def reset_db() -> None:
    import asyncio

    with open(SCHEMA) as f:
        schema = f.read()

    async def run() -> None:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute("DROP TABLE IF EXISTS incidents")
        await conn.execute(schema)
        await conn.close()

    asyncio.run(run())


@pytest.fixture
def make_client(prom: FakePrometheus, reset_db: None) -> Iterator[Callable[..., TestClient]]:
    clients: list[TestClient] = []

    def make(**overrides: Any) -> TestClient:
        settings = Settings(database_url=DATABASE_URL, prometheus_url="http://prometheus", **overrides)
        server = fakeredis.FakeServer()
        app = create_app(
            settings,
            redis_factory=lambda: fakeredis.FakeAsyncRedis(server=server, decode_responses=True),
            http_transport=httpx.MockTransport(prom.handler),
        )
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client

    yield make
    for c in clients:
        c.__exit__(None, None, None)


@pytest.fixture
def client(make_client: Callable[..., TestClient]) -> TestClient:
    return make_client()

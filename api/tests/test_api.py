import time

from fastapi.testclient import TestClient

from tests.conftest import FakePrometheus

FIRING = {
    "version": "4",
    "status": "firing",
    "alerts": [
        {
            "status": "firing",
            "labels": {"alertname": "PostgresDown", "severity": "critical", "service": "postgres"},
            "annotations": {"summary": "PostgreSQL is down", "description": "pg_up is 0"},
            "startsAt": "2026-11-07T10:00:00Z",
            "endsAt": "0001-01-01T00:00:00Z",
            "fingerprint": "abc123",
        }
    ],
}


def resolved() -> dict:
    payload = {**FIRING, "status": "resolved"}
    payload["alerts"] = [{**FIRING["alerts"][0], "status": "resolved", "endsAt": "2026-11-07T10:05:30Z"}]
    return payload


def test_health_and_ready(client: TestClient, prom: FakePrometheus) -> None:
    assert client.get("/health").json()["status"] == "healthy"

    ready = client.get("/ready")
    assert ready.status_code == 200
    assert {k: v["status"] for k, v in ready.json()["checks"].items()} == {
        "postgres": "ok",
        "redis": "ok",
        "prometheus": "ok",
    }

    prom.down = True
    not_ready = client.get("/ready")
    assert not_ready.status_code == 503
    assert not_ready.json()["checks"]["prometheus"]["status"] == "error"


def test_services_reflect_prometheus(client: TestClient, prom: FakePrometheus) -> None:
    prom.vector("max(pg_up)", ({}, 1))
    prom.vector("max(redis_up)", ({}, 0))
    prom.vector('max(up{job="api"})', ({}, 1))
    started = time.time() - 120
    prom.vector('container_start_time_seconds{name=~"infra-.+"}', ({"name": "infra-postgres"}, started))

    services = {s["name"]: s for s in client.get("/api/services").json()}
    assert services["postgres"]["status"] == "healthy"
    assert 115 < services["postgres"]["uptime_seconds"] < 130
    assert services["redis"]["status"] == "unhealthy"
    assert services["api"]["status"] == "healthy"
    assert services["grafana"]["status"] == "unknown"  # no data for its query
    assert services["grafana"]["uptime_seconds"] is None

    assert client.get("/api/services/redis").json()["status"] == "unhealthy"
    assert client.get("/api/services/nope").status_code == 404


def test_services_when_prometheus_is_down(client: TestClient, prom: FakePrometheus) -> None:
    prom.down = True
    assert client.get("/api/services").status_code == 503


def test_prometheus_answers_are_cached(client: TestClient, prom: FakePrometheus) -> None:
    client.get("/api/services")
    calls = prom.calls
    client.get("/api/services")
    assert prom.calls == calls


def test_metrics_snapshot(client: TestClient, prom: FakePrometheus) -> None:
    from src.routes.metrics_snapshot import SERIES

    prom.ranges[SERIES["cpu"][1]] = [
        {"metric": {}, "values": [[1000, "41.5"], [1060, "NaN"], [1120, "43.25"]]}
    ]
    prom.vector('time() - process_start_time_seconds{job="api"}', ({}, 3600))

    snap = client.get("/api/metrics/snapshot").json()
    series = {s["name"]: s for s in snap["series"]}
    assert set(series) == {"cpu", "memory", "requests", "latency", "errors"}
    assert [p["value"] for p in series["cpu"]["points"]] == [41.5, 43.25]  # NaN dropped
    assert series["memory"]["points"] == []
    assert snap["current"]["cpu"] == 43.25
    assert snap["current"]["uptime_seconds"] == 3600


def test_alert_lifecycle(client: TestClient) -> None:
    assert client.post("/api/alerts", json=FIRING).status_code == 202
    assert client.post("/api/alerts", json=FIRING).status_code == 202  # re-sent notification

    active = client.get("/api/incidents/active").json()
    assert len(active) == 1
    assert active[0]["title"] == "PostgreSQL is down"
    assert active[0]["service"] == "postgres"
    assert active[0]["resolved"] is False

    client.post("/api/alerts", json=resolved())
    assert client.get("/api/incidents/active").json() == []

    [incident] = client.get("/api/incidents?resolved=true").json()
    assert incident["duration_seconds"] == 330
    assert client.get("/api/incidents?severity=warning").json() == []


def test_webhook_token(make_client) -> None:  # type: ignore[no-untyped-def]
    client = make_client(alert_webhook_token="s3cret")
    assert client.post("/api/alerts", json=FIRING).status_code == 401
    ok = client.post("/api/alerts", json=FIRING, headers={"Authorization": "Bearer s3cret"})
    assert ok.status_code == 202


def test_request_metrics_use_route_templates(client: TestClient) -> None:
    client.get("/api/services/does-not-exist")
    body = client.get("/metrics").text
    assert 'endpoint="/api/services/{name}"' in body
    assert "does-not-exist" not in body
    assert "process_start_time_seconds" in body


def test_static_docs(client: TestClient) -> None:
    arch = client.get("/api/architecture").json()
    assert arch["nodes"] and arch["edges"]
    assert client.get("/api/runbook/deploy").json()["steps"]
    assert client.get("/api/runbook/nope").status_code == 404

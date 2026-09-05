"""Tests for the dashboard-facing API routes."""


def test_services_list(client):
    response = client.get("/api/services")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    sample = data[0]
    for key in (
        "name",
        "kind",
        "status",
        "port",
        "image",
        "uptime_seconds",
        "description",
        "depends_on",
    ):
        assert key in sample, f"missing key: {key}"


def test_services_single(client):
    response = client.get("/api/services/nginx")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "nginx"
    assert data["kind"] == "proxy"
    assert data["port"] == 80


def test_services_not_found(client):
    response = client.get("/api/services/does-not-exist")
    assert response.status_code == 404


def test_services_health(client):
    response = client.get("/api/services/nginx/health")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "nginx"
    assert data["status"] in {"healthy", "degraded", "unhealthy", "unknown"}
    assert "checked_at" in data


def test_incidents_list(client):
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Sorted newest first.
    assert data == sorted(data, key=lambda i: i["created_at"], reverse=True)


def test_incidents_filter_severity(client):
    response = client.get("/api/incidents?severity=critical")
    assert response.status_code == 200
    for inc in response.json():
        assert inc["severity"] == "critical"


def test_incidents_filter_resolved(client):
    response = client.get("/api/incidents?resolved=false")
    assert response.status_code == 200
    for inc in response.json():
        assert inc["resolved"] is False


def test_incidents_active(client):
    response = client.get("/api/incidents/active")
    assert response.status_code == 200
    for inc in response.json():
        assert inc["resolved"] is False


def test_architecture(client):
    response = client.get("/api/architecture")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data and "edges" in data and "legend" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0


def test_metrics_snapshot(client):
    response = client.get("/api/metrics/snapshot")
    assert response.status_code == 200
    data = response.json()
    assert "generated_at" in data
    assert "series" in data and "current" in data
    assert len(data["series"]) == 5
    for series in data["series"]:
        assert "name" in series and "unit" in series and "points" in series
        assert len(series["points"]) == 60


def test_runbook_list(client):
    response = client.get("/api/runbook")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    sample = data[0]
    for key in ("id", "title", "summary", "severity", "steps"):
        assert key in sample


def test_runbook_single(client):
    response = client.get("/api/runbook/deploy")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "deploy"
    assert len(data["steps"]) > 0


def test_runbook_not_found(client):
    response = client.get("/api/runbook/does-not-exist")
    assert response.status_code == 404

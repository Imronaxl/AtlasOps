def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_body(client):
    response = client.get("/health")
    data = response.json()
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data


def test_ready_returns_200(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_status_returns_200(client):
    response = client.get("/status")
    assert response.status_code == 200


def test_status_body(client):
    response = client.get("/status")
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "uptime_seconds" in data


def test_metrics_returns_200(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text

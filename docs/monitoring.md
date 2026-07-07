# Monitoring Stack

## Overview

The monitoring stack provides full observability into infrastructure and application metrics.

## Components

### Prometheus

Time-series database for metrics collection.

**Configuration**: `monitoring/prometheus/prometheus.yml`

**Scrape Targets**:
- Prometheus itself (self-monitoring)
- Node Exporter (host metrics)
- cAdvisor (container metrics)
- FastAPI application
- Nginx stub_status
- Alertmanager

**Retention**: 15 days (configurable via `PROMETHEUS_RETENTION`)

### Grafana

Visualization and dashboarding platform.

**Provisioning**: `monitoring/grafana/provisioning/`
**Dashboards**: `monitoring/grafana/dashboards/`

**Access**: http://localhost:3000

### Alertmanager

Alert routing and notification.

**Configuration**: `monitoring/alertmanager/config.yml`

**Receivers**:
- Webhook (configurable URL)
- Email (SMTP configurable)

### Node Exporter

Host-level metrics collector.

**Metrics**: CPU, Memory, Disk, Network, Filesystem

### cAdvisor

Container resource monitoring.

**Metrics**: Container CPU, Memory, Network, Filesystem

## Dashboard Panels

### System Overview
- CPU Usage (stat)
- Memory Usage (stat)
- Disk Usage (stat)
- Active Containers (stat)

### CPU & Memory
- CPU Usage Over Time (timeseries)
- Memory Usage Over Time (timeseries)

### Containers
- Container CPU Usage (timeseries)
- Container Memory Usage (timeseries)

### Network
- Network Receive (timeseries)
- Network Transmit (timeseries)

### API Metrics
- API Request Rate (timeseries)
- API Latency p95 (timeseries)

### Disk
- Disk Space (timeseries)
- Disk I/O (timeseries)

## Alert Rules

### Infrastructure Alerts

| Alert | Expr | For | Severity |
|-------|------|-----|----------|
| HighCPUUsage | CPU > 80% | 5m | warning |
| HighMemoryUsage | Memory > 90% | 5m | warning |
| HighDiskUsage | Disk > 85% | 5m | warning |
| ContainerDown | Container down | 1m | critical |
| ContainerHighCPU | Container CPU > 80% | 5m | warning |
| ContainerHighMemory | Container Memory > 90% | 5m | warning |

### Application Alerts

| Alert | Expr | For | Severity |
|-------|------|-----|----------|
| APILatencyHigh | p95 > 1s | 5m | warning |
| HighErrorRate | 5xx > 5% | 5m | critical |

### Network Alerts

| Alert | Expr | For | Severity |
|-------|------|-----|----------|
| HighNetworkInbound | > 100Mbps | 5m | warning |
| HighNetworkOutbound | > 100Mbps | 5m | warning |

## Adding Custom Metrics

### In Python API

```python
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "my_metric_total",
    "Description",
    ["label1", "label2"],
)

REQUEST_COUNT.labels(label1="value1", label2="value2").inc()
```

### In Prometheus Config

Add new scrape target:

```yaml
- job_name: "my-service"
  static_configs:
    - targets: ["my-service:9090"]
```

## Troubleshooting

### Prometheus not scraping

1. Check target status: http://localhost:9090/targets
2. Verify network connectivity
3. Check scrape interval in config

### Grafana dashboard not showing data

1. Verify datasource is configured
2. Check Prometheus is reachable from Grafana
3. Verify query syntax in panel editor

### Alerts not firing

1. Check alert rules are loaded: http://localhost:9090/rules
2. Verify Alertmanager is running
3. Check Alertmanager config for routing issues

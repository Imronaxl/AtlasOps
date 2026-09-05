# Стек мониторинга

## Обзор

Стек мониторинга обеспечивает полную наблюдаемость за метриками инфраструктуры и приложения.

## Компоненты

### Prometheus

Time-series БД для сбора метрик.

**Конфигурация**: `monitoring/prometheus/prometheus.yml`

**Таргеты скрейпинга**:
- Prometheus (self-monitoring)
- Node Exporter (метрики хоста)
- cAdvisor (метрики контейнеров)
- Приложение FastAPI
- Nginx stub_status
- Alertmanager

**Хранение**: 15 дней (настраивается через `PROMETHEUS_RETENTION`)

### Grafana

Платформа визуализации и дашбордов.

**Provisioning**: `monitoring/grafana/provisioning/`
**Дашборды**: `monitoring/grafana/dashboards/`

**Доступ**: http://localhost:3000

### Alertmanager

Маршрутизация алертов и нотификации.

**Конфигурация**: `monitoring/alertmanager/config.yml`

**Получатели**:
- Webhook (настраиваемый URL)
- Email (SMTP настраивается)

### Node Exporter

Сборщик метрик на уровне хоста.

**Метрики**: CPU, Memory, Disk, Network, Filesystem

### cAdvisor

Мониторинг ресурсов контейнеров.

**Метрики**: CPU контейнера, Memory, Network, Filesystem

## Панели дашборда

### Обзор системы
- CPU Usage (stat)
- Memory Usage (stat)
- Disk Usage (stat)
- Active Containers (stat)

### CPU и память
- CPU Usage Over Time (timeseries)
- Memory Usage Over Time (timeseries)

### Контейнеры
- Container CPU Usage (timeseries)
- Container Memory Usage (timeseries)

### Сеть
- Network Receive (timeseries)
- Network Transmit (timeseries)

### Метрики API
- API Request Rate (timeseries)
- API Latency p95 (timeseries)

### Диск
- Disk Space (timeseries)
- Disk I/O (timeseries)

## Правила алертов

### Инфраструктурные алерты

| Алерт | Условие | Длительность | Severity |
|-------|---------|--------------|----------|
| HighCPUUsage | CPU > 80% | 5m | warning |
| HighMemoryUsage | Memory > 90% | 5m | warning |
| HighDiskUsage | Disk > 85% | 5m | warning |
| ContainerDown | Контейнер упал | 1m | critical |
| ContainerHighCPU | CPU контейнера > 80% | 5m | warning |
| ContainerHighMemory | Memory контейнера > 90% | 5m | warning |

### Прикладные алерты

| Алерт | Условие | Длительность | Severity |
|-------|---------|--------------|----------|
| APILatencyHigh | p95 > 1s | 5m | warning |
| HighErrorRate | 5xx > 5% | 5m | critical |

### Сетевые алерты

| Алерт | Условие | Длительность | Severity |
|-------|---------|--------------|----------|
| HighNetworkInbound | > 100Mbps | 5m | warning |
| HighNetworkOutbound | > 100Mbps | 5m | warning |

## Добавление кастомных метрик

### В Python API

```python
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "my_metric_total",
    "Description",
    ["label1", "label2"],
)

REQUEST_COUNT.labels(label1="value1", label2="value2").inc()
```

### В конфиге Prometheus

Добавить новый таргет скрейпинга:

```yaml
- job_name: "my-service"
  static_configs:
    - targets: ["my-service:9090"]
```

## Траблшутинг

### Prometheus не скрейпит

1. Проверить статус таргетов: http://localhost:9090/targets
2. Проверить сетевую доступность
3. Проверить scrape interval в конфиге

### Дашборд Grafana не показывает данные

1. Проверить, что datasource настроен
2. Убедиться, что Prometheus достижим из Grafana
3. Проверить синтаксис запроса в редакторе панели

### Алерты не срабатывают

1. Проверить, что правила загружены: http://localhost:9090/rules
2. Убедиться, что Alertmanager запущен
3. Проверить конфиг Alertmanager на предмет ошибок маршрутизации

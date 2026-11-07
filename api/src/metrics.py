from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram
from prometheus_client.gc_collector import GCCollector
from prometheus_client.process_collector import ProcessCollector

registry = CollectorRegistry()
ProcessCollector(registry=registry)  # process_start_time_seconds is used for uptime
GCCollector(registry=registry)

REQUEST_COUNT = Counter(
    "http_requests_total",
    "HTTP requests handled by the API.",
    ["method", "endpoint", "status"],
    registry=registry,
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency.",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
    registry=registry,
)
IN_FLIGHT = Gauge("http_requests_in_flight", "Requests being served.", registry=registry)
ALERTS_RECEIVED = Counter(
    "atlasops_alerts_received_total",
    "Alerts received from Alertmanager.",
    ["status"],
    registry=registry,
)
UPSTREAM_ERRORS = Counter(
    "atlasops_upstream_errors_total",
    "Failed calls to dependencies.",
    ["dependency"],
    registry=registry,
)

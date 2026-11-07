// Static content for the dashboard. Architecture and runbooks are copies of
// api/src/routes/architecture.py and runbook.py, shown while the API is offline;
// regenerate them if those files change.

import type { ApiEndpoint, Architecture, CliStep, Runbook } from "./types";

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    "method": "GET",
    "path": "/health",
    "description": "Liveness probe. Does not touch dependencies.",
    "curl": "curl -s localhost:8000/health",
    "response_example": "{\n  \"status\": \"healthy\",\n  \"uptime_seconds\": 3624.5\n}"
  },
  {
    "method": "GET",
    "path": "/ready",
    "description": "Readiness: checks PostgreSQL, Redis and Prometheus; 503 if any fails.",
    "curl": "curl -s localhost:8000/ready",
    "response_example": "{\n  \"status\": \"ready\",\n  \"checks\": {\n    \"postgres\": {\n      \"status\": \"ok\",\n      \"latency_ms\": 1.9\n    },\n    \"redis\": {\n      \"status\": \"ok\",\n      \"latency_ms\": 0.8\n    },\n    \"prometheus\": {\n      \"status\": \"ok\",\n      \"latency_ms\": 3.9\n    }\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/services",
    "description": "Every service in the stack with health from Prometheus and uptime from cAdvisor.",
    "curl": "curl -s localhost:8000/api/services",
    "response_example": "[\n  {\n    \"name\": \"postgres\",\n    \"kind\": \"db\",\n    \"status\": \"healthy\",\n    \"port\": 5432,\n    \"image\": \"postgres:16-alpine\",\n    \"uptime_seconds\": 7215.3,\n    \"description\": \"Stores incidents received from Alertmanager.\",\n    \"depends_on\": []\n  }\n]"
  },
  {
    "method": "GET",
    "path": "/api/metrics/snapshot",
    "description": "Last hour of CPU, memory, request rate, p95 latency and error rate (1 min step).",
    "curl": "curl -s localhost:8000/api/metrics/snapshot",
    "response_example": "{\n  \"generated_at\": 1794060000,\n  \"series\": [\n    {\n      \"name\": \"cpu\",\n      \"unit\": \"%\",\n      \"points\": [\n        {\n          \"t\": 1794059940,\n          \"value\": 12.4\n        }\n      ]\n    }\n  ],\n  \"current\": {\n    \"cpu\": 12.4,\n    \"memory\": 38.1,\n    \"requests\": 4.2,\n    \"latency\": 18.0,\n    \"errors\": 0.0,\n    \"uptime_seconds\": 3600.0\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/incidents",
    "description": "Alerts received from Alertmanager. Filters: severity, resolved, limit.",
    "curl": "curl -s 'localhost:8000/api/incidents?resolved=false'",
    "response_example": "[\n  {\n    \"id\": 1,\n    \"service\": \"redis\",\n    \"severity\": \"critical\",\n    \"title\": \"Redis is down\",\n    \"description\": \"redis-exporter cannot connect to Redis.\",\n    \"created_at\": \"2026-11-07T14:18:33Z\",\n    \"resolved_at\": null,\n    \"resolved\": false,\n    \"duration_seconds\": null\n  }\n]"
  },
  {
    "method": "GET",
    "path": "/api/architecture",
    "description": "Nodes and edges of the stack for the architecture diagram.",
    "curl": "curl -s localhost:8000/api/architecture",
    "response_example": "{\n  \"nodes\": [\n    {\n      \"id\": \"api\",\n      \"label\": \"API\",\n      \"kind\": \"app\",\n      \"port\": 8000\n    }\n  ],\n  \"edges\": [\n    {\n      \"source\": \"alertmanager\",\n      \"target\": \"api\",\n      \"label\": \"webhook\",\n      \"kind\": \"http\"\n    }\n  ]\n}"
  },
  {
    "method": "GET",
    "path": "/api/runbook",
    "description": "Operational procedures with commands.",
    "curl": "curl -s localhost:8000/api/runbook/backup",
    "response_example": "{\n  \"id\": \"backup\",\n  \"title\": \"PostgreSQL backup\",\n  \"steps\": [\n    \"\\u2026\"\n  ]\n}"
  },
  {
    "method": "GET",
    "path": "/metrics",
    "description": "Prometheus metrics of the API itself.",
    "curl": "curl -s localhost:8000/metrics | grep http_requests_total",
    "response_example": "http_requests_total{endpoint=\"/api/services\",method=\"GET\",status=\"200\"} 42.0"
  }
];

// Sample terminal session for the CLI view. Output is abbreviated.
export const CLI_DEMO: CliStep[] = [
  {
    "command": "make up",
    "description": "Start the stack",
    "output": [
      "[+] Running 15/15",
      "  Container infra-postgres           Healthy",
      "  Container infra-redis              Healthy",
      "  Container infra-api                Healthy",
      "  Container infra-nginx              Started",
      "  Container infra-prometheus         Started",
      "  Container infra-alertmanager       Started",
      "[✓] Services starting. Run 'make status' to check."
    ]
  },
  {
    "command": "make healthcheck",
    "description": "Check containers, endpoints, disk and memory",
    "output": [
      "Infrastructure Health Check",
      "Container Health",
      "[✓] infra-nginx: healthy",
      "[✓] infra-api: healthy",
      "[✓] infra-postgres: healthy",
      "[✓] infra-postgres-exporter: running",
      "Endpoint Health",
      "[✓] API: 200",
      "[✓] API dependencies: 200",
      "[✓] Prometheus: 200",
      "Results: 21/21 passed"
    ]
  },
  {
    "command": "make backup",
    "description": "Dump PostgreSQL to backups/",
    "output": [
      "Starting PostgreSQL backup",
      "Dump size: 84K",
      "[✓] Backup created: ./backups/backup_20261107_142000.sql.gz (12K)",
      "Removed 0 backups older than 7 days"
    ]
  },
  {
    "command": "docker compose stop redis",
    "description": "Simulate an outage: RedisDown fires after one minute",
    "output": [
      "[+] Stopping 1/1",
      "  Container infra-redis  Stopped"
    ]
  },
  {
    "command": "curl -s localhost:8000/api/incidents/active",
    "description": "Alertmanager has posted the alert to the API webhook",
    "output": [
      "[{\"id\":1,\"service\":\"redis\",\"severity\":\"critical\",",
      "  \"title\":\"Redis is down\",\"resolved\":false}]"
    ]
  }
];

export const ARCHITECTURE_FALLBACK: Architecture = {
  "nodes": [
    {
      "id": "internet",
      "label": "Internet",
      "kind": "external",
      "port": null,
      "description": "User traffic.",
      "x": 1,
      "y": 1
    },
    {
      "id": "nginx",
      "label": "nginx",
      "kind": "proxy",
      "port": 80,
      "description": "Reverse proxy: rate limiting, security headers, gzip.",
      "x": 3,
      "y": 1
    },
    {
      "id": "api",
      "label": "API",
      "kind": "app",
      "port": 8000,
      "description": "FastAPI: reads Prometheus over PromQL, stores incidents.",
      "x": 5,
      "y": 1
    },
    {
      "id": "postgres",
      "label": "PostgreSQL",
      "kind": "db",
      "port": 5432,
      "description": "Incidents received from Alertmanager.",
      "x": 7,
      "y": 2
    },
    {
      "id": "redis",
      "label": "Redis",
      "kind": "cache",
      "port": 6379,
      "description": "Short-lived cache of Prometheus query results.",
      "x": 7,
      "y": 0
    },
    {
      "id": "prometheus",
      "label": "Prometheus",
      "kind": "monitor",
      "port": 9090,
      "description": "Scrapes all targets, evaluates alert rules.",
      "x": 9,
      "y": 1
    },
    {
      "id": "grafana",
      "label": "Grafana",
      "kind": "monitor",
      "port": 3000,
      "description": "Provisioned dashboards over Prometheus.",
      "x": 11,
      "y": 2
    },
    {
      "id": "alertmanager",
      "label": "Alertmanager",
      "kind": "monitor",
      "port": 9093,
      "description": "Groups alerts and posts them to the API.",
      "x": 11,
      "y": 0
    },
    {
      "id": "node-exporter",
      "label": "node-exporter",
      "kind": "exporter",
      "port": 9100,
      "description": "Host CPU, memory, disk, network.",
      "x": 9,
      "y": 3
    },
    {
      "id": "cadvisor",
      "label": "cAdvisor",
      "kind": "exporter",
      "port": 8080,
      "description": "Per-container CPU, memory, I/O.",
      "x": 9,
      "y": -1
    },
    {
      "id": "postgres-exporter",
      "label": "postgres-exporter",
      "kind": "exporter",
      "port": 9187,
      "description": "PostgreSQL metrics, pg_up.",
      "x": 7,
      "y": 3
    },
    {
      "id": "redis-exporter",
      "label": "redis-exporter",
      "kind": "exporter",
      "port": 9121,
      "description": "Redis metrics, redis_up.",
      "x": 7,
      "y": -1
    },
    {
      "id": "nginx-exporter",
      "label": "nginx-exporter",
      "kind": "exporter",
      "port": 9113,
      "description": "nginx stub_status as metrics.",
      "x": 3,
      "y": -1
    }
  ],
  "edges": [
    {
      "source": "internet",
      "target": "nginx",
      "label": "HTTP :80",
      "kind": "http"
    },
    {
      "source": "nginx",
      "target": "api",
      "label": "proxy_pass",
      "kind": "http"
    },
    {
      "source": "api",
      "target": "postgres",
      "label": "asyncpg",
      "kind": "depend"
    },
    {
      "source": "api",
      "target": "redis",
      "label": "cache",
      "kind": "depend"
    },
    {
      "source": "prometheus",
      "target": "api",
      "label": "/metrics, PromQL",
      "kind": "scrape"
    },
    {
      "source": "prometheus",
      "target": "node-exporter",
      "label": "/metrics",
      "kind": "scrape"
    },
    {
      "source": "prometheus",
      "target": "cadvisor",
      "label": "/metrics",
      "kind": "scrape"
    },
    {
      "source": "prometheus",
      "target": "postgres-exporter",
      "label": "/metrics",
      "kind": "scrape"
    },
    {
      "source": "prometheus",
      "target": "redis-exporter",
      "label": "/metrics",
      "kind": "scrape"
    },
    {
      "source": "prometheus",
      "target": "nginx-exporter",
      "label": "/metrics",
      "kind": "scrape"
    },
    {
      "source": "postgres-exporter",
      "target": "postgres",
      "label": "SQL",
      "kind": "depend"
    },
    {
      "source": "redis-exporter",
      "target": "redis",
      "label": "INFO",
      "kind": "depend"
    },
    {
      "source": "nginx-exporter",
      "target": "nginx",
      "label": "stub_status",
      "kind": "depend"
    },
    {
      "source": "prometheus",
      "target": "alertmanager",
      "label": "alerts",
      "kind": "http"
    },
    {
      "source": "alertmanager",
      "target": "api",
      "label": "webhook",
      "kind": "http"
    },
    {
      "source": "grafana",
      "target": "prometheus",
      "label": "query",
      "kind": "http"
    }
  ],
  "legend": {
    "external": "External traffic",
    "proxy": "Reverse proxy",
    "app": "Application (FastAPI)",
    "db": "Data storage",
    "cache": "Cache",
    "monitor": "Monitoring and alerting",
    "exporter": "Metrics exporter",
    "http": "HTTP call",
    "scrape": "Metrics scrape (pull)",
    "depend": "Runtime dependency"
  }
};

export const RUNBOOKS_FALLBACK: Runbook[] = [
  {
    "id": "deploy",
    "title": "Deploy",
    "summary": "Rebuild images and recreate changed containers. The API restarts, so expect a few seconds of 502s from nginx.",
    "severity": "info",
    "steps": [
      {
        "title": "1. Verify health before deploy",
        "description": "First make sure everything is green, otherwise we cannot roll.",
        "command": "make healthcheck",
        "expected": "All services healthy. If not \u2014 fix first, then deploy."
      },
      {
        "title": "2. Build fresh images",
        "description": "Build api and nginx with the latest code.",
        "command": "make build",
        "expected": "infra-api:latest and infra-nginx:latest images rebuilt."
      },
      {
        "title": "3. Run the deploy script",
        "description": "The script performs a rolling update and waits for health-check.",
        "command": "make deploy",
        "expected": "New container is up, /health returns 200, old one drained."
      },
      {
        "title": "4. Watch metrics after deploy",
        "description": "Look at error rate and latency for 5-10 minutes.",
        "command": "curl -s localhost:8000/api/incidents/active",
        "expected": "No 5xx spike, latency within normal range."
      }
    ]
  },
  {
    "id": "backup",
    "title": "PostgreSQL backup",
    "summary": "Take a compressed DB dump and store it under backups/.",
    "severity": "info",
    "steps": [
      {
        "title": "1. Run the backup",
        "description": "The script runs pg_dump and gzip.",
        "command": "make backup",
        "expected": "File backups/infra_monitor_YYYYMMDD_HHMMSS.sql.gz created."
      },
      {
        "title": "2. Verify size and content",
        "description": "Backup must be non-empty and decompress without errors.",
        "command": "ls -lh backups/ && gunzip -t backups/*.sql.gz",
        "expected": "Size > 0, gunzip -t is silent (all good)."
      },
      {
        "title": "3. Copy the backup offsite",
        "description": "A backup on the same machine is not a backup. Copy to S3 / another host.",
        "command": "aws s3 cp backups/*.sql.gz s3://my-bucket/atlasops/",
        "expected": "File visible in S3, ETag matches."
      }
    ]
  },
  {
    "id": "restore",
    "title": "PostgreSQL restore",
    "summary": "Restore the DB from a backup. Always take a safety backup of the current state first.",
    "severity": "warning",
    "steps": [
      {
        "title": "1. Safety backup",
        "description": "Before restore, always snapshot the current state.",
        "command": "make backup",
        "expected": "Safety backup created in case we need to roll back."
      },
      {
        "title": "2. Stop the API",
        "description": "So nobody writes to the DB during restore.",
        "command": "docker compose stop api",
        "expected": "infra-api container stopped."
      },
      {
        "title": "3. Apply the backup",
        "description": "The script restores the selected backup.",
        "command": "make restore FILE=backups/backup_20260101_120000.sql.gz",
        "expected": "services/incidents tables filled with data from the backup."
      },
      {
        "title": "4. Bring the API back and verify",
        "description": "Return the API to the rotation and check its health.",
        "command": "docker compose up -d api && make healthcheck",
        "expected": "API healthy, /status responds, data is in place."
      }
    ]
  },
  {
    "id": "high-cpu",
    "title": "High CPU troubleshooting",
    "summary": "CPU on the host or in a container hit the ceiling. Figure out who is burning it.",
    "severity": "warning",
    "steps": [
      {
        "title": "1. Look at per-container CPU",
        "description": "cAdvisor exposes metrics per container.",
        "command": "docker stats --no-stream",
        "expected": "See which container is loading CPU."
      },
      {
        "title": "2. Check Alertmanager alerts",
        "description": "Which rules fired: ContainerHighCPU or HighCPUUsage.",
        "command": "curl http://localhost:9093/api/v2/alerts",
        "expected": "Clear which alert triggered."
      },
      {
        "title": "3. Profile inside the container",
        "description": "If the culprit is api, run top inside the container.",
        "command": "docker exec -it infra-api top",
        "expected": "See the specific process/thread."
      },
      {
        "title": "4. Decide: throttle / scale / restart",
        "description": "Throttle via nginx limit_req, scale via replicas, or restart.",
        "command": "docker compose restart api",
        "expected": "CPU back to normal, alerts moved to resolved."
      }
    ]
  },
  {
    "id": "disk-full",
    "title": "Disk space low",
    "summary": "Disk has < 5GB free. Clean logs, backups, docker cache.",
    "severity": "critical",
    "steps": [
      {
        "title": "1. Find who consumed the space",
        "description": "First look at where files ballooned.",
        "command": "du -sh /var/lib/docker/* | sort -h",
        "expected": "See the top disk consumers."
      },
      {
        "title": "2. Clean old backups",
        "description": "Keep backups for 7 days, drop the rest.",
        "command": "find backups/ -mtime +7 -delete",
        "expected": "Old backups removed."
      },
      {
        "title": "3. Log rotation",
        "description": "Run the log rotation script for nginx/api.",
        "command": "make rotate-logs",
        "expected": "Logs compressed and trimmed to the limit."
      },
      {
        "title": "4. Docker prune",
        "description": "Clean unused images, containers, volumes.",
        "command": "make cleanup",
        "expected": "Space freed, df shows > 10GB free."
      }
    ]
  }
];

"""Runbook: operational procedures.

Each procedure is a step-by-step guide for an on-call engineer: what
to do in a specific situation (deploy, backup, restore, troubleshooting).
The frontend renders these as cards with steps and commands so during
an interview you can click and discuss.
"""

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["runbook"])
logger = structlog.get_logger()


class RunbookStep(BaseModel):
    """A single step of a procedure."""

    title: str
    description: str
    command: str | None = Field(None, description="Shell command if any")
    expected: str = Field("", description="What should happen after the step")


class Runbook(BaseModel):
    """A full procedure."""

    id: str
    title: str
    summary: str
    severity: str = Field("info", description="How often/urgent this is applied")
    steps: list[RunbookStep]


_RUNBOOKS: list[Runbook] = [
    Runbook(
        id="deploy",
        title="Zero-downtime deploy",
        summary="Update the API without downtime: bring up new replicas, switch nginx, drain old ones.",
        severity="info",
        steps=[
            RunbookStep(
                title="1. Verify health before deploy",
                description="First make sure everything is green, otherwise we cannot roll.",
                command="make healthcheck",
                expected="All services healthy. If not — fix first, then deploy.",
            ),
            RunbookStep(
                title="2. Build fresh images",
                description="Build api and nginx with the latest code.",
                command="make build",
                expected="infra-api:latest and infra-nginx:latest images rebuilt.",
            ),
            RunbookStep(
                title="3. Run the deploy script",
                description="The script performs a rolling update and waits for health-check.",
                command="make deploy",
                expected="New container is up, /health returns 200, old one drained.",
            ),
            RunbookStep(
                title="4. Watch metrics after deploy",
                description="Look at error rate and latency for 5-10 minutes.",
                command="curl http://localhost:9090/api/v1/query?query=rate(http_requests_total%5B5m%5D)",
                expected="No 5xx spike, latency within normal range.",
            ),
        ],
    ),
    Runbook(
        id="backup",
        title="PostgreSQL backup",
        summary="Take a compressed DB dump and store it under backups/.",
        severity="info",
        steps=[
            RunbookStep(
                title="1. Run the backup",
                description="The script runs pg_dump and gzip.",
                command="make backup",
                expected="File backups/infra_monitor_YYYYMMDD_HHMMSS.sql.gz created.",
            ),
            RunbookStep(
                title="2. Verify size and content",
                description="Backup must be non-empty and decompress without errors.",
                command="ls -lh backups/ && gunzip -t backups/*.sql.gz",
                expected="Size > 0, gunzip -t is silent (all good).",
            ),
            RunbookStep(
                title="3. Copy the backup offsite",
                description="A backup on the same machine is not a backup. Copy to S3 / another host.",
                command="aws s3 cp backups/*.sql.gz s3://my-bucket/atlasops/",
                expected="File visible in S3, ETag matches.",
            ),
        ],
    ),
    Runbook(
        id="restore",
        title="PostgreSQL restore",
        summary="Restore the DB from a backup. Always take a safety backup of the current state first.",
        severity="warning",
        steps=[
            RunbookStep(
                title="1. Safety backup",
                description="Before restore, always snapshot the current state.",
                command="make backup",
                expected="Safety backup created in case we need to roll back.",
            ),
            RunbookStep(
                title="2. Stop the API",
                description="So nobody writes to the DB during restore.",
                command="docker compose stop api",
                expected="infra-api container stopped.",
            ),
            RunbookStep(
                title="3. Apply the backup",
                description="The script restores the selected backup.",
                command="BACKUP_FILE=backups/infra_monitor_20250101_120000.sql.gz make restore",
                expected="services/incidents tables filled with data from the backup.",
            ),
            RunbookStep(
                title="4. Bring the API back and verify",
                description="Return the API to the rotation and check its health.",
                command="docker compose up -d api && make healthcheck",
                expected="API healthy, /status responds, data is in place.",
            ),
        ],
    ),
    Runbook(
        id="high-cpu",
        title="High CPU troubleshooting",
        summary="CPU on the host or in a container hit the ceiling. Figure out who is burning it.",
        severity="warning",
        steps=[
            RunbookStep(
                title="1. Look at per-container CPU",
                description="cAdvisor exposes metrics per container.",
                command="docker stats --no-stream",
                expected="See which container is loading CPU.",
            ),
            RunbookStep(
                title="2. Check Alertmanager alerts",
                description="Which rules fired: ContainerHighCPU or HighCPUUsage.",
                command="curl http://localhost:9093/api/v2/alerts",
                expected="Clear which alert triggered.",
            ),
            RunbookStep(
                title="3. Profile inside the container",
                description="If the culprit is api, run top inside the container.",
                command="docker exec -it infra-api top",
                expected="See the specific process/thread.",
            ),
            RunbookStep(
                title="4. Decide: throttle / scale / restart",
                description="Throttle via nginx limit_req, scale via replicas, or restart.",
                command="docker compose restart api",
                expected="CPU back to normal, alerts moved to resolved.",
            ),
        ],
    ),
    Runbook(
        id="disk-full",
        title="Disk space low",
        summary="Disk has < 5GB free. Clean logs, backups, docker cache.",
        severity="critical",
        steps=[
            RunbookStep(
                title="1. Find who consumed the space",
                description="First look at where files ballooned.",
                command="du -sh /var/lib/docker/* | sort -h",
                expected="See the top disk consumers.",
            ),
            RunbookStep(
                title="2. Clean old backups",
                description="Keep backups for 7 days, drop the rest.",
                command="find backups/ -mtime +7 -delete",
                expected="Old backups removed.",
            ),
            RunbookStep(
                title="3. Log rotation",
                description="Run the log rotation script for nginx/api.",
                command="make rotate-logs",
                expected="Logs compressed and trimmed to the limit.",
            ),
            RunbookStep(
                title="4. Docker prune",
                description="Clean unused images, containers, volumes.",
                command="make cleanup",
                expected="Space freed, df shows > 10GB free.",
            ),
        ],
    ),
]


@router.get("/runbook", response_model=list[Runbook])
async def list_runbooks():
    """All runbook procedures."""
    logger.info("runbook_list", count=len(_RUNBOOKS))
    return _RUNBOOKS


@router.get("/runbook/{rid}", response_model=Runbook)
async def get_runbook(rid: str):
    """A single procedure by id. 404 if not found."""
    for r in _RUNBOOKS:
        if r.id == rid:
            return r
    raise HTTPException(status_code=404, detail=f"runbook '{rid}' not found")

import time
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter

from src.config import get_settings

router = APIRouter()
logger = structlog.get_logger()

_start_time = time.monotonic()


@router.get("/health")
async def health():
    settings = get_settings()
    uptime = time.monotonic() - _start_time

    logger.info(
        "health_check",
        endpoint="/health",
        status="healthy",
        uptime_seconds=round(uptime, 2),
    )

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(uptime, 2),
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.get("/ready")
async def ready():
    return {"status": "ready"}

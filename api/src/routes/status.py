import time
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter

from src.config import get_settings

router = APIRouter()
logger = structlog.get_logger()

_start_time = time.monotonic()


@router.get("/status")
async def status():
    settings = get_settings()
    uptime = time.monotonic() - _start_time

    logger.info("status_check", endpoint="/status", uptime_seconds=round(uptime, 2))

    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "uptime_seconds": round(uptime, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "database": "configured",
            "cache": "configured",
        },
    }

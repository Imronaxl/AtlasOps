import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "infra-monitor-api"
    app_version: str = "1.0.0"
    environment: str = os.getenv("API_ENV", "production")
    log_level: str = os.getenv("API_LOG_LEVEL", "info")

    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://infra_admin:changeme_postgres_secret@postgres:5432/infra_monitor",
    )
    redis_url: str = os.getenv(
        "REDIS_URL",
        "redis://:changeme_redis_secret@redis:6379/0",
    )

    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8000"))
    api_workers: int = int(os.getenv("API_WORKERS", "2"))

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

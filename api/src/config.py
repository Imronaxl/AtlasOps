from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "atlasops-api"
    app_version: str = "1.1.0"
    api_env: str = "production"

    database_url: str = "postgresql://infra_admin:changeme@postgres:5432/infra_monitor"
    redis_url: str = "redis://redis:6379/0"
    prometheus_url: str = "http://prometheus:9090"

    # Seconds to cache Prometheus answers in Redis; the dashboard polls them.
    query_cache_ttl: int = 10
    # Optional bearer token Alertmanager must send to the webhook.
    alert_webhook_token: str = ""
    cors_origins: list[str] = []

    @property
    def postgres_dsn(self) -> str:
        # asyncpg wants a plain postgresql:// URL.
        return self.database_url.replace("postgresql+asyncpg://", "postgresql://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()

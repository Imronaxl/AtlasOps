"""Incidents are Alertmanager alerts persisted in PostgreSQL.

Alertmanager posts firing and resolved alerts to the webhook. An alert is
identified by its fingerprint and start time, so a re-sent notification
updates the existing row instead of creating a duplicate.
"""

from datetime import datetime
from typing import Any

import asyncpg

UPSERT = """
INSERT INTO incidents (fingerprint, alertname, service, severity, summary, description, starts_at, ends_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (fingerprint, starts_at) DO UPDATE
SET ends_at = EXCLUDED.ends_at,
    summary = EXCLUDED.summary,
    description = EXCLUDED.description,
    updated_at = now()
"""


class IncidentStore:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def upsert(self, alerts: list[dict[str, Any]]) -> int:
        rows = []
        for a in alerts:
            labels, ann = a.get("labels", {}), a.get("annotations", {})
            ends_at = _parse(a.get("endsAt")) if a.get("status") == "resolved" else None
            rows.append(
                (
                    a["fingerprint"],
                    labels.get("alertname", "unknown"),
                    labels.get("service") or labels.get("job") or labels.get("name") or "",
                    labels.get("severity", "info"),
                    ann.get("summary") or labels.get("alertname", ""),
                    ann.get("description", ""),
                    _parse(a["startsAt"]),
                    ends_at,
                )
            )
        async with self._pool.acquire() as conn:
            await conn.executemany(UPSERT, rows)
        return len(rows)

    async def list(self, severity: str | None, resolved: bool | None, limit: int) -> list[asyncpg.Record]:
        sql = "SELECT * FROM incidents WHERE ($1::text IS NULL OR severity = $1)"
        if resolved is True:
            sql += " AND ends_at IS NOT NULL"
        elif resolved is False:
            sql += " AND ends_at IS NULL"
        sql += " ORDER BY starts_at DESC LIMIT $2"
        async with self._pool.acquire() as conn:
            return await conn.fetch(sql, severity, limit)  # type: ignore[no-any-return]


def _parse(value: str | None) -> datetime | None:
    if not value or value.startswith("0001-01-01"):  # Alertmanager's "no end time"
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

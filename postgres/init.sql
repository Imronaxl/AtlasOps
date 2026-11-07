-- Runs once, when the postgres volume is created.
-- Incidents are Alertmanager alerts received by the API webhook.

CREATE TABLE IF NOT EXISTS incidents (
    id          BIGSERIAL PRIMARY KEY,
    fingerprint TEXT        NOT NULL,
    alertname   TEXT        NOT NULL,
    service     TEXT        NOT NULL DEFAULT '',
    severity    TEXT        NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    summary     TEXT        NOT NULL DEFAULT '',
    description TEXT        NOT NULL DEFAULT '',
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Alertmanager re-sends notifications; one row per alert occurrence.
    UNIQUE (fingerprint, starts_at)
);

CREATE INDEX IF NOT EXISTS ix_incidents_starts_at ON incidents (starts_at DESC);
CREATE INDEX IF NOT EXISTS ix_incidents_active ON incidents (starts_at DESC) WHERE ends_at IS NULL;

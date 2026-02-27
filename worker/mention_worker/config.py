from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(slots=True)
class Settings:
    database_url: str
    worker_lock_key: int
    poll_interval_minutes: int
    overlap_minutes: int
    per_source_limit: int
    source_task_batch_size: int
    alert_batch_size: int
    max_alert_retries: int
    retry_base_seconds: int
    retry_max_seconds: int
    reddit_enabled: bool
    hn_enabled: bool
    devto_enabled: bool
    reddit_client_id: str | None
    reddit_client_secret: str | None
    reddit_user_agent: str
    devto_top_days: int
    request_timeout_seconds: float


def _to_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def load_settings() -> Settings:
    # Explicitly load .env.local first, fallback to .env
    from pathlib import Path
    dotenv_path = Path(__file__).parent.parent / ".env.local"
    if dotenv_path.exists():
        load_dotenv(dotenv_path=dotenv_path)
    else:
        load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    return Settings(
        database_url=database_url,
        worker_lock_key=int(os.getenv("WORKER_LOCK_KEY", "84521791")),
        poll_interval_minutes=int(os.getenv("POLL_INTERVAL_MINUTES", "15")),
        overlap_minutes=int(os.getenv("SOURCE_OVERLAP_MINUTES", "3")),
        per_source_limit=int(os.getenv("PER_SOURCE_RESULT_LIMIT", "40")),
        source_task_batch_size=int(os.getenv("SOURCE_TASK_BATCH_SIZE", "300")),
        alert_batch_size=int(os.getenv("ALERT_BATCH_SIZE", "250")),
        max_alert_retries=int(os.getenv("MAX_ALERT_RETRIES", "3")),
        retry_base_seconds=int(os.getenv("ALERT_RETRY_BASE_SECONDS", "60")),
        retry_max_seconds=int(os.getenv("ALERT_RETRY_MAX_SECONDS", "1800")),
        reddit_enabled=_to_bool(os.getenv("SOURCE_REDDIT_ENABLED"), default=True),
        hn_enabled=_to_bool(os.getenv("SOURCE_HN_ENABLED"), default=True),
        devto_enabled=_to_bool(os.getenv("SOURCE_DEVTO_ENABLED"), default=False),
        reddit_client_id=os.getenv("REDDIT_CLIENT_ID"),
        reddit_client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        reddit_user_agent=os.getenv("REDDIT_USER_AGENT", "mention-worker/1.0"),
        devto_top_days=int(os.getenv("DEVTO_TOP_DAYS", "7")),
        request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "20")),
    )

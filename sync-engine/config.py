from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Optional

from dotenv import load_dotenv


load_dotenv()


def _read_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None or value == "":
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


@dataclass(frozen=True)
class Config:
    sync_write_enabled: bool
    supabase_url: Optional[str]
    supabase_service_key: Optional[str]
    spotify_access_token: Optional[str]


def load_config() -> Config:
    return Config(
        sync_write_enabled=_read_bool(os.getenv("SYNC_WRITE_ENABLED"), default=False),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_service_key=os.getenv("SUPABASE_SERVICE_KEY"),
        spotify_access_token=os.getenv("SPOTIFY_ACCESS_TOKEN"),
    )


def require_read_only_mode(config: Config) -> None:
    if config.sync_write_enabled:
        raise RuntimeError("SYNC_WRITE_ENABLED must remain false for the read-only smoke command")

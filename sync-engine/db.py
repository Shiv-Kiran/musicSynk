from __future__ import annotations

from typing import Any, Optional

import requests


class SupabaseReadClient:
    def __init__(self, *, url: str, service_key: str, timeout_seconds: int = 20) -> None:
        self._base_url = url.rstrip("/")
        self._timeout = timeout_seconds
        self._session = requests.Session()
        self._session.headers.update(
            {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Accept": "application/json",
            }
        )

    def _get(self, table: str, query: str) -> list[dict[str, Any]]:
        response = self._session.get(
            f"{self._base_url}/rest/v1/{table}",
            params={"select": "*", **self._parse_query(query)},
            timeout=self._timeout,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list):
            raise RuntimeError(f"Unexpected Supabase response for {table}")
        return data

    @staticmethod
    def _parse_query(query: str) -> dict[str, str]:
        if not query:
            return {}
        parts = [segment for segment in query.split("&") if segment]
        result: dict[str, str] = {}
        for part in parts:
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            result[key] = value
        return result

    def list_recent_runs(self, limit: int = 5) -> list[dict[str, Any]]:
        return self._get("sync_runs", f"order=started_at.desc&limit={int(limit)}")

    def get_auth_session(self, service: str) -> Optional[dict[str, Any]]:
        rows = self._get("auth_sessions", f"service=eq.{service}&limit=1")
        return rows[0] if rows else None

from __future__ import annotations

from datetime import UTC, datetime

import httpx

from mention_worker.models import MentionCandidate

_DEVTO_ARTICLES_URL = "https://dev.to/api/articles"


class DevToSource:
    """Best-effort Dev.to polling using public articles API.

    Dev.to's public API does not expose full-text query search across all posts,
    so we fetch recent articles and apply local keyword matching.
    """

    def __init__(self, client: httpx.Client, *, top_days: int = 7) -> None:
        self._client = client
        self._top_days = max(top_days, 1)

    def search(self, query: str, *, since: datetime, limit: int) -> list[MentionCandidate]:
        normalized = query.casefold().strip()
        if not normalized:
            return []

        response = self._client.get(
            _DEVTO_ARTICLES_URL,
            params={"top": self._top_days, "per_page": min(max(limit, 1), 100), "page": 1},
        )
        response.raise_for_status()
        payload = response.json()

        results: list[MentionCandidate] = []
        for item in payload:
            published_raw = item.get("published_at") or item.get("created_at")
            try:
                published_at = datetime.fromisoformat(str(published_raw).replace("Z", "+00:00"))
            except Exception:
                published_at = datetime.now(tz=UTC)

            if published_at < since:
                continue

            title = item.get("title") or "Dev.to mention"
            description = item.get("description") or ""
            tags = item.get("tag_list")
            if isinstance(tags, list):
                tag_text = " ".join(str(tag) for tag in tags)
            else:
                tag_text = str(tags or "")

            haystack = f"{title} {description} {tag_text}".casefold()
            if normalized not in haystack:
                continue

            article_id = item.get("id")
            url = item.get("url")
            if not article_id or not url:
                continue

            user_data = item.get("user") or {}
            results.append(
                MentionCandidate(
                    platform="devto",
                    external_id=str(article_id),
                    url=url,
                    title=title.strip(),
                    body_excerpt=" ".join(description.split())[:500],
                    author=user_data.get("name") or user_data.get("username"),
                    community="dev.to",
                    published_at=published_at,
                    raw_payload=item,
                )
            )

        return results

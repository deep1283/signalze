from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from mention_worker.models import MentionCandidate

_TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
_SEARCH_URL = "https://oauth.reddit.com/search"


class RedditSource:
    def __init__(
        self,
        *,
        client: httpx.Client,
        client_id: str,
        client_secret: str,
        user_agent: str,
    ) -> None:
        self._client = client
        self._client_id = client_id
        self._client_secret = client_secret
        self._user_agent = user_agent
        self._token: str | None = None
        self._token_expires_at: datetime | None = None

    def _access_token(self) -> str:
        now = datetime.now(tz=timezone.utc)
        if self._token and self._token_expires_at and now < self._token_expires_at:
            return self._token

        response = self._client.post(
            _TOKEN_URL,
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": self._user_agent},
            auth=(self._client_id, self._client_secret),
        )
        response.raise_for_status()
        payload = response.json()

        token = payload.get("access_token")
        expires_in = int(payload.get("expires_in", 3600))
        if not token:
            raise RuntimeError("Reddit token response missing access_token")

        self._token = token
        self._token_expires_at = now + timedelta(seconds=max(expires_in - 60, 60))
        return token

    def search(self, query: str, *, since: datetime, limit: int) -> list[MentionCandidate]:
        token = self._access_token()

        params = {
            "q": query,
            "sort": "new",
            "limit": min(max(limit, 1), 100),
            "type": "link,comment",
            "t": "day",
            "restrict_sr": "false",
        }
        response = self._client.get(
            _SEARCH_URL,
            params=params,
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": self._user_agent,
            },
        )
        response.raise_for_status()
        payload = response.json()

        results: list[MentionCandidate] = []
        children = payload.get("data", {}).get("children", [])
        for child in children:
            data = child.get("data", {})

            created_utc = data.get("created_utc")
            if created_utc is None:
                continue

            published_at = datetime.fromtimestamp(float(created_utc), tz=timezone.utc)
            if published_at < since:
                continue

            item_name = data.get("name")
            if not item_name:
                continue

            permalink = data.get("permalink") or data.get("link_permalink")
            url = f"https://reddit.com{permalink}" if permalink else data.get("url")
            if not url:
                continue

            title = data.get("title") or data.get("link_title") or "Reddit mention"
            body = data.get("selftext") or data.get("body") or ""

            results.append(
                MentionCandidate(
                    platform="reddit",
                    external_id=str(item_name),
                    url=url,
                    title=title.strip(),
                    body_excerpt=" ".join(body.split())[:500],
                    author=data.get("author"),
                    community=f"r/{data['subreddit']}" if data.get("subreddit") else "Reddit",
                    published_at=published_at,
                    raw_payload=data,
                )
            )

        return results

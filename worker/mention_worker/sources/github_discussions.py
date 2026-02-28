from __future__ import annotations

from datetime import datetime, timezone
import httpx

from mention_worker.models import MentionCandidate

_GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

_SEARCH_QUERY = """
query SearchDiscussions($query: String!, $first: Int!) {
  search(query: $query, type: DISCUSSION, first: $first) {
    nodes {
      ... on Discussion {
        id
        url
        title
        bodyText
        createdAt
        updatedAt
        author {
          login
        }
        repository {
          name
          owner {
            login
          }
        }
      }
    }
  }
}
"""


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


class GitHubDiscussionsSource:
    def __init__(self, client: httpx.Client, *, token: str) -> None:
        self._client = client
        self._token = token

    def search(self, query: str, *, since: datetime, limit: int) -> list[MentionCandidate]:
        first = min(max(limit, 1), 50)
        search_query = f"{query} sort:updated-desc"

        response = self._client.post(
            _GITHUB_GRAPHQL_URL,
            json={
                "query": _SEARCH_QUERY,
                "variables": {
                    "query": search_query,
                    "first": first,
                },
            },
            headers={
                "Authorization": f"Bearer {self._token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "signalze-mention-worker/1.0",
            },
        )
        response.raise_for_status()
        payload = response.json()

        errors = payload.get("errors")
        if isinstance(errors, list) and errors:
            message = errors[0].get("message") if isinstance(errors[0], dict) else "GitHub GraphQL error"
            raise RuntimeError(str(message))

        nodes = payload.get("data", {}).get("search", {}).get("nodes", [])
        if not isinstance(nodes, list):
            return []

        results: list[MentionCandidate] = []

        for node in nodes:
            if not isinstance(node, dict):
                continue

            external_id = str(node.get("id") or "").strip()
            url = str(node.get("url") or "").strip()
            if not external_id or not url:
                continue

            created_at = _parse_dt(str(node.get("createdAt") or ""))
            updated_at = _parse_dt(str(node.get("updatedAt") or ""))
            effective_time = updated_at or created_at or datetime.now(tz=timezone.utc)
            if effective_time < since:
                continue

            published_at = created_at or effective_time
            title = str(node.get("title") or "GitHub discussion mention").strip()
            body = str(node.get("bodyText") or "")

            author_obj = node.get("author")
            author = None
            if isinstance(author_obj, dict):
                author = author_obj.get("login")
                if author is not None:
                    author = str(author)

            repo_obj = node.get("repository")
            community = "GitHub Discussions"
            if isinstance(repo_obj, dict):
                repo_name = str(repo_obj.get("name") or "").strip()
                owner_obj = repo_obj.get("owner")
                owner_login = ""
                if isinstance(owner_obj, dict):
                    owner_login = str(owner_obj.get("login") or "").strip()
                if repo_name and owner_login:
                    community = f"{owner_login}/{repo_name}"
                elif repo_name:
                    community = repo_name

            results.append(
                MentionCandidate(
                    platform="github_discussions",
                    external_id=external_id,
                    url=url,
                    title=title,
                    body_excerpt=" ".join(body.split())[:500],
                    author=author,
                    community=community,
                    published_at=published_at,
                    raw_payload=node,
                )
            )

        return results

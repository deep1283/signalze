from __future__ import annotations

from datetime import datetime, timedelta, timezone
import unittest

from mention_worker.sources.github_discussions import GitHubDiscussionsSource


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeClient:
    def __init__(self, payload: dict) -> None:
        self._payload = payload
        self.last_post: dict | None = None

    def post(self, url: str, **kwargs):
        self.last_post = {"url": url, **kwargs}
        return _FakeResponse(self._payload)


class GitHubDiscussionsSourceTests(unittest.TestCase):
    def test_search_filters_old_rows_and_handles_missing_fields(self) -> None:
        now = datetime.now(tz=timezone.utc)
        since = now - timedelta(hours=24)

        payload = {
            "data": {
                "search": {
                    "nodes": [
                        {
                            "id": "D_kwA_recent",
                            "url": "https://github.com/acme/repo/discussions/1",
                            "title": "Signalze mention in release thread",
                            "bodyText": "Long body text with useful context.",
                            "createdAt": (since + timedelta(hours=1)).isoformat(),
                            "updatedAt": (since + timedelta(hours=2)).isoformat(),
                            "author": {"login": "octocat"},
                            "repository": {"name": "repo", "owner": {"login": "acme"}},
                        },
                        {
                            "id": "D_kwA_old",
                            "url": "https://github.com/acme/repo/discussions/2",
                            "title": "Old mention",
                            "bodyText": "This should be filtered out by recency guard.",
                            "createdAt": (since - timedelta(days=5)).isoformat(),
                            "updatedAt": (since - timedelta(days=2)).isoformat(),
                            "author": {"login": "archived-user"},
                            "repository": {"name": "repo", "owner": {"login": "acme"}},
                        },
                        {
                            "id": "D_kwA_fallback",
                            "url": "https://github.com/org/another/discussions/3",
                            "title": "",
                            "bodyText": "   body with   extra     spaces   ",
                            "createdAt": (since + timedelta(hours=3)).isoformat(),
                            "updatedAt": None,
                            "author": None,
                            "repository": None,
                        },
                        {
                            # Missing URL should be ignored safely.
                            "id": "D_kwA_no_url",
                            "title": "No URL",
                            "createdAt": (since + timedelta(hours=4)).isoformat(),
                        },
                    ]
                }
            }
        }
        client = _FakeClient(payload)
        source = GitHubDiscussionsSource(client, token="ghp_test")

        results = source.search("signalze", since=since, limit=100)

        self.assertEqual(len(results), 2)

        first = results[0]
        self.assertEqual(first.platform, "github_discussions")
        self.assertEqual(first.external_id, "D_kwA_recent")
        self.assertEqual(first.author, "octocat")
        self.assertEqual(first.community, "acme/repo")
        self.assertEqual(first.url, "https://github.com/acme/repo/discussions/1")

        second = results[1]
        self.assertEqual(second.external_id, "D_kwA_fallback")
        self.assertEqual(second.title, "GitHub discussion mention")
        self.assertEqual(second.author, None)
        self.assertEqual(second.community, "GitHub Discussions")
        self.assertEqual(second.body_excerpt, "body with extra spaces")

        self.assertIsNotNone(client.last_post)
        assert client.last_post is not None
        self.assertIn("signalze sort:updated-desc", client.last_post["json"]["variables"]["query"])
        self.assertEqual(client.last_post["json"]["variables"]["first"], 50)


if __name__ == "__main__":
    unittest.main()

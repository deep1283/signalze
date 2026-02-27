from __future__ import annotations

from mention_worker.config import load_settings
from mention_worker.pipeline import Worker


def main() -> int:
    settings = load_settings()
    worker = Worker(settings)
    return worker.run_once()


if __name__ == "__main__":
    raise SystemExit(main())

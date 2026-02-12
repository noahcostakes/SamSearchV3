"""Lightweight benchmark for atomic quota consumption."""
import asyncio
import os
import sys
import time

import fakeredis.aioredis

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.services.usage_tracker import UsageTracker


async def main() -> None:
    redis = fakeredis.aioredis.FakeRedis()
    tracker = UsageTracker(redis)

    user_id = "benchmark-user"
    iterations = 1000
    concurrency = 50

    original_hourly = settings.RATE_LIMIT_SEARCHES_PER_HOUR
    original_daily = settings.RATE_LIMIT_SEARCHES_PER_DAY
    settings.RATE_LIMIT_SEARCHES_PER_HOUR = iterations
    settings.RATE_LIMIT_SEARCHES_PER_DAY = iterations

    try:
        start = time.perf_counter()
        for _ in range(iterations // concurrency):
            await asyncio.gather(
                *[
                    tracker.try_consume_user_search(user_id)
                    for _ in range(concurrency)
                ]
            )
        elapsed = time.perf_counter() - start
    finally:
        settings.RATE_LIMIT_SEARCHES_PER_HOUR = original_hourly
        settings.RATE_LIMIT_SEARCHES_PER_DAY = original_daily
        await redis.aclose()

    throughput = iterations / elapsed
    print(f"iterations={iterations}")
    print(f"concurrency={concurrency}")
    print(f"elapsed_seconds={elapsed:.4f}")
    print(f"throughput_ops_per_sec={throughput:.2f}")


if __name__ == "__main__":
    asyncio.run(main())

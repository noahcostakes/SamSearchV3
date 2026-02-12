"""Concurrency tests for atomic user search quota consumption."""
import asyncio
import time

import pytest

from app.config import settings
from app.services.usage_tracker import UsageTracker


@pytest.mark.asyncio
async def test_try_consume_user_search_is_atomic_under_concurrency(test_redis):
    tracker = UsageTracker(test_redis)
    user_id = "concurrent-user"

    original_hourly = settings.RATE_LIMIT_SEARCHES_PER_HOUR
    original_daily = settings.RATE_LIMIT_SEARCHES_PER_DAY
    settings.RATE_LIMIT_SEARCHES_PER_HOUR = 3
    settings.RATE_LIMIT_SEARCHES_PER_DAY = 3

    async def consume_once():
        return await tracker.try_consume_user_search(user_id)

    try:
        started = time.perf_counter()
        results = await asyncio.gather(*[consume_once() for _ in range(12)])
        elapsed = time.perf_counter() - started
    finally:
        settings.RATE_LIMIT_SEARCHES_PER_HOUR = original_hourly
        settings.RATE_LIMIT_SEARCHES_PER_DAY = original_daily

    allowed_count = sum(1 for allowed, _, _, _ in results if allowed)
    denied_count = len(results) - allowed_count

    assert allowed_count == 3
    assert denied_count == 9
    assert elapsed < 2.0

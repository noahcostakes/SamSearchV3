"""Usage tracking for API limits and billing."""
from datetime import datetime, timezone
from typing import Optional

from redis.asyncio import Redis

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class UsageTracker:
    """Track API usage for rate limiting and billing."""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def get_sam_usage_today(self) -> tuple[int, int]:
        """
        Get SAM.gov API usage for today.

        Returns:
            tuple: (used, remaining)
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"usage:sam:{today}"

        try:
            used = await self.redis.get(key)
            used = int(used) if used else 0
            remaining = max(0, settings.SAM_RATE_LIMIT_PER_DAY - used)
            return used, remaining
        except Exception as e:
            logger.error(f"Failed to get SAM usage: {e}")
            return 0, settings.SAM_RATE_LIMIT_PER_DAY

    async def increment_sam_usage(self) -> int:
        """
        Increment SAM.gov API usage counter.

        Returns new count.
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"usage:sam:{today}"

        try:
            count = await self.redis.incr(key)
            if count == 1:
                # Expire at end of day + buffer
                await self.redis.expire(key, 90000)
            return count
        except Exception as e:
            logger.error(f"Failed to increment SAM usage: {e}")
            return 0

    async def check_sam_limit(self) -> bool:
        """
        Check if SAM.gov API limit allows another request.

        Returns True if under limit, False if exceeded.
        """
        used, remaining = await self.get_sam_usage_today()
        return remaining > 0

    async def get_user_search_count(self, user_id: str, period: str = "day") -> int:
        """
        Get user's search count for the given period.

        Args:
            user_id: User ID
            period: "hour" or "day"
        """
        now = datetime.now(timezone.utc)
        if period == "hour":
            key_suffix = now.strftime("%Y-%m-%d-%H")
        else:
            key_suffix = now.strftime("%Y-%m-%d")

        key = f"usage:search:{user_id}:{key_suffix}"

        try:
            count = await self.redis.get(key)
            return int(count) if count else 0
        except Exception as e:
            logger.error(f"Failed to get user search count: {e}")
            return 0

    async def increment_user_search(self, user_id: str) -> tuple[int, int]:
        """
        Increment user's search counters.

        Returns (hourly_count, daily_count).
        """
        now = datetime.now(timezone.utc)

        # Hourly key
        hour_key = f"usage:search:{user_id}:{now.strftime('%Y-%m-%d-%H')}"
        # Daily key
        day_key = f"usage:search:{user_id}:{now.strftime('%Y-%m-%d')}"

        try:
            # Increment both
            pipe = self.redis.pipeline()
            pipe.incr(hour_key)
            pipe.incr(day_key)
            pipe.expire(hour_key, 3600)
            pipe.expire(day_key, 86400)
            results = await pipe.execute()

            return results[0], results[1]
        except Exception as e:
            logger.error(f"Failed to increment user search: {e}")
            return 0, 0

    async def check_user_search_limits(
        self, user_id: str
    ) -> tuple[bool, Optional[str]]:
        """
        Check if user is within search rate limits.

        Returns:
            tuple: (allowed, error_message or None)
        """
        hourly = await self.get_user_search_count(user_id, "hour")
        daily = await self.get_user_search_count(user_id, "day")

        if hourly >= settings.RATE_LIMIT_SEARCHES_PER_HOUR:
            return False, "Hourly search limit reached. Please try again later."

        if daily >= settings.RATE_LIMIT_SEARCHES_PER_DAY:
            return False, "Daily search limit reached. Resets at midnight UTC."

        return True, None

    async def get_user_usage_stats(self, user_id: str) -> dict:
        """Get user's usage statistics."""
        hourly = await self.get_user_search_count(user_id, "hour")
        daily = await self.get_user_search_count(user_id, "day")

        return {
            "searches_this_hour": hourly,
            "searches_today": daily,
            "hourly_limit": settings.RATE_LIMIT_SEARCHES_PER_HOUR,
            "daily_limit": settings.RATE_LIMIT_SEARCHES_PER_DAY,
            "hourly_remaining": max(0, settings.RATE_LIMIT_SEARCHES_PER_HOUR - hourly),
            "daily_remaining": max(0, settings.RATE_LIMIT_SEARCHES_PER_DAY - daily),
        }

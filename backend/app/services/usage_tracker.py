"""Usage tracking for API limits and billing."""
from datetime import datetime, timezone
from typing import Optional

from redis.asyncio import Redis
from redis.exceptions import WatchError

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

    async def try_consume_user_search(
        self, user_id: str
    ) -> tuple[bool, Optional[str], int, int]:
        """
        Atomically check and consume one user search quota.

        Returns:
            tuple: (allowed, error_message, hourly_count, daily_count)
        """
        now = datetime.now(timezone.utc)
        hour_key = f"usage:search:{user_id}:{now.strftime('%Y-%m-%d-%H')}"
        day_key = f"usage:search:{user_id}:{now.strftime('%Y-%m-%d')}"

        try:
            while True:
                pipe = self.redis.pipeline()
                try:
                    await pipe.watch(hour_key, day_key)
                    hourly_raw = await pipe.get(hour_key)
                    daily_raw = await pipe.get(day_key)
                    hourly = int(hourly_raw) if hourly_raw else 0
                    daily = int(daily_raw) if daily_raw else 0

                    if hourly >= settings.RATE_LIMIT_SEARCHES_PER_HOUR:
                        await pipe.reset()
                        return (
                            False,
                            "Hourly search limit reached. Please try again later.",
                            hourly,
                            daily,
                        )
                    if daily >= settings.RATE_LIMIT_SEARCHES_PER_DAY:
                        await pipe.reset()
                        return (
                            False,
                            "Daily search limit reached. Resets at midnight UTC.",
                            hourly,
                            daily,
                        )

                    pipe.multi()
                    pipe.incr(hour_key)
                    pipe.incr(day_key)
                    if hourly == 0:
                        pipe.expire(hour_key, 3600)
                    if daily == 0:
                        pipe.expire(day_key, 86400)
                    results = await pipe.execute()
                    return True, None, int(results[0]), int(results[1])
                except WatchError:
                    # Key changed concurrently; retry transaction.
                    continue
                finally:
                    await pipe.reset()
        except Exception as e:
            logger.error(f"Failed to atomically consume user search: {e}")
            # Fail closed — deny searches when Redis is unavailable to prevent
            # quota bypass and protect SAM.gov API rate limits.
            return False, "Search service temporarily unavailable. Please try again later.", 0, 0

    # ------------------------------------------------------------------
    # Per-user SAM.gov API quota
    # ------------------------------------------------------------------

    async def get_user_sam_usage_today(self, user_id: str) -> tuple[int, int]:
        """Get per-user SAM.gov API usage for today.

        Returns:
            tuple: (used, remaining)
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"usage:sam:{user_id}:{today}"

        try:
            used = await self.redis.get(key)
            used = int(used) if used else 0
            # Per-user share of global quota (default: 20% of global limit)
            per_user_limit = settings.SAM_RATE_LIMIT_PER_DAY // 5
            remaining = max(0, per_user_limit - used)
            return used, remaining
        except Exception as e:
            logger.error(f"Failed to get per-user SAM usage: {e}")
            return 0, 0  # Fail closed

    async def increment_user_sam_usage(self, user_id: str) -> int:
        """Increment per-user SAM.gov API usage counter.

        Also increments the global counter.  Returns new per-user count.
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        user_key = f"usage:sam:{user_id}:{today}"
        global_key = f"usage:sam:{today}"

        try:
            pipe = self.redis.pipeline()
            pipe.incr(user_key)
            pipe.incr(global_key)
            pipe.expire(user_key, 90000)
            pipe.expire(global_key, 90000)
            results = await pipe.execute()
            return int(results[0])
        except Exception as e:
            logger.error(f"Failed to increment per-user SAM usage: {e}")
            return 0

    async def check_user_sam_limit(self, user_id: str) -> tuple[bool, Optional[str]]:
        """Check both global and per-user SAM.gov API limits.

        Returns:
            tuple: (allowed, error_message or None)
        """
        # Global limit
        global_ok = await self.check_sam_limit()
        if not global_ok:
            return False, "Platform SAM.gov daily quota exhausted. Try again tomorrow."

        # Per-user limit
        _, remaining = await self.get_user_sam_usage_today(user_id)
        if remaining <= 0:
            return False, "Your daily SAM.gov API quota reached. Resets at midnight UTC."

        return True, None

    # ------------------------------------------------------------------
    # Aggregated user stats
    # ------------------------------------------------------------------

    async def get_user_usage_stats(self, user_id: str) -> dict:
        """Get user's usage statistics including SAM quota."""
        hourly = await self.get_user_search_count(user_id, "hour")
        daily = await self.get_user_search_count(user_id, "day")
        sam_used, sam_remaining = await self.get_user_sam_usage_today(user_id)
        global_sam_used, global_sam_remaining = await self.get_sam_usage_today()
        per_user_sam_limit = settings.SAM_RATE_LIMIT_PER_DAY // 5

        return {
            "searches_this_hour": hourly,
            "searches_today": daily,
            "hourly_limit": settings.RATE_LIMIT_SEARCHES_PER_HOUR,
            "daily_limit": settings.RATE_LIMIT_SEARCHES_PER_DAY,
            "hourly_remaining": max(0, settings.RATE_LIMIT_SEARCHES_PER_HOUR - hourly),
            "daily_remaining": max(0, settings.RATE_LIMIT_SEARCHES_PER_DAY - daily),
            "sam_api_used_today": sam_used,
            "sam_api_remaining_today": sam_remaining,
            "sam_api_user_limit": per_user_sam_limit,
            "sam_api_global_used": global_sam_used,
            "sam_api_global_remaining": global_sam_remaining,
        }

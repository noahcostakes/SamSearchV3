"""Rate limiting using Redis."""
from datetime import datetime, timezone
from typing import Optional

from redis.asyncio import Redis

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Redis-based rate limiter for API endpoints."""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def check_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        """
        Check if request is within rate limit.

        Returns:
            tuple: (allowed, remaining, reset_at_timestamp)
        """
        now = datetime.now(timezone.utc)
        window_key = f"ratelimit:{key}:{int(now.timestamp()) // window_seconds}"

        try:
            # Increment counter
            current = await self.redis.incr(window_key)

            # Set expiry on first request in window
            if current == 1:
                await self.redis.expire(window_key, window_seconds)

            # Calculate remaining and reset time
            remaining = max(0, max_requests - current)
            reset_at = (int(now.timestamp()) // window_seconds + 1) * window_seconds

            allowed = current <= max_requests

            if not allowed:
                logger.warning(
                    f"Rate limit exceeded for {key}",
                    extra={"key": key, "current": current, "max": max_requests},
                )

            return allowed, remaining, reset_at

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request if Redis is unavailable
            return True, max_requests, 0

    async def check_user_search_limit(self, user_id: str) -> tuple[bool, str]:
        """
        Check if user is within search rate limits.

        Returns:
            tuple: (allowed, error_message or None)
        """
        # Check hourly limit
        hourly_key = f"search:hourly:{user_id}"
        allowed, remaining, _ = await self.check_limit(
            hourly_key,
            settings.RATE_LIMIT_SEARCHES_PER_HOUR,
            3600,
        )
        if not allowed:
            return False, "Search limit reached. Please try again in an hour."

        # Check daily limit
        daily_key = f"search:daily:{user_id}"
        allowed, remaining, _ = await self.check_limit(
            daily_key,
            settings.RATE_LIMIT_SEARCHES_PER_DAY,
            86400,
        )
        if not allowed:
            return False, "Daily search limit reached. Resets at midnight UTC."

        return True, ""

    async def get_sam_api_usage(self) -> tuple[int, int]:
        """
        Get current SAM.gov API usage for today.

        Returns:
            tuple: (used, remaining)
        """
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"sam_api:daily:{today}"

        try:
            used = await self.redis.get(key)
            used = int(used) if used else 0
            remaining = max(0, settings.SAM_RATE_LIMIT_PER_DAY - used)
            return used, remaining
        except Exception as e:
            logger.error(f"Failed to get SAM API usage: {e}")
            return 0, settings.SAM_RATE_LIMIT_PER_DAY

    async def increment_sam_api_usage(self) -> int:
        """Increment SAM.gov API usage counter. Returns new count."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"sam_api:daily:{today}"

        try:
            count = await self.redis.incr(key)
            if count == 1:
                # Set expiry to end of day + 1 hour buffer
                await self.redis.expire(key, 90000)
            return count
        except Exception as e:
            logger.error(f"Failed to increment SAM API usage: {e}")
            return 0

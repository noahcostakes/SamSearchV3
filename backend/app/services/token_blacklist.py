"""Token blacklist service for logout functionality."""
from datetime import timedelta
from typing import Optional

from redis.asyncio import Redis

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class TokenBlacklist:
    """Manage JWT token blacklist for logout functionality."""

    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    async def add_token(self, token: str, expires_in: int) -> None:
        """Add token to blacklist with TTL."""
        key = f"blacklist:token:{token}"
        try:
            await self.redis.setex(key, expires_in, "1")
            logger.info(f"Token blacklisted: {token[:20]}...")
        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")
            raise

    async def is_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        key = f"blacklist:token:{token}"
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Failed to check token blacklist: {e}")
            # Fail closed - treat as blacklisted if Redis is down
            return True

    async def add_user_logout(self, user_id: str, logout_time: int) -> None:
        """Mark all user's tokens before logout_time as invalid."""
        key = f"blacklist:user:{user_id}:logout_time"
        try:
            # Store logout timestamp (tokens issued before this are invalid)
            await self.redis.setex(
                key,
                int(timedelta(days=7).total_seconds()),  # Match refresh token expiry
                str(logout_time),
            )
        except Exception as e:
            logger.error(f"Failed to set user logout time: {e}")
            raise

    async def get_user_logout_time(self, user_id: str) -> int:
        """Get user's logout timestamp."""
        key = f"blacklist:user:{user_id}:logout_time"
        try:
            value = await self.redis.get(key)
            return int(value) if value else 0
        except Exception as e:
            logger.error(f"Failed to get user logout time: {e}")
            return 0

    async def verify_token_not_blacklisted(
        self, token: str, user_id: str, token_iat: Optional[int]
    ) -> bool:
        """
        Verify token is not blacklisted.

        Returns True if token is valid, False if blacklisted.
        """
        # Check if specific token is blacklisted
        if await self.is_blacklisted(token):
            return False

        # Check if user logged out after token was issued
        if token_iat:
            user_logout_time = await self.get_user_logout_time(user_id)
            if user_logout_time and token_iat <= user_logout_time:
                return False

        return True

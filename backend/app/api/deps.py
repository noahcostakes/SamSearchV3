"""API dependencies for authentication and database access."""
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging_config import get_logger
from app.core.security import decode_token, verify_token_type
from app.db.session import get_db, get_redis
from app.models.user import User
from app.services.token_blacklist import TokenBlacklist

logger = get_logger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_token_from_header(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Extract JWT token from Authorization header."""
    return credentials.credentials


async def get_current_user(
    token: str = Depends(get_token_from_header),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    """
    Get current authenticated user from JWT token.

    Validates token, checks blacklist, and returns user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode token
    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    # Verify token type is access
    if not verify_token_type(payload, "access"):
        raise credentials_exception

    # Check token blacklist
    blacklist = TokenBlacklist(redis)
    user_id = payload.get("sub")
    token_iat = payload.get("iat")

    if not user_id:
        raise credentials_exception

    # Convert iat to timestamp if it's a datetime
    if isinstance(token_iat, datetime):
        token_iat = int(token_iat.timestamp())
    elif isinstance(token_iat, (int, float)):
        token_iat = int(token_iat)

    is_valid = await blacklist.verify_token_not_blacklisted(token, user_id, token_iat)
    if not is_valid:
        raise credentials_exception

    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload or not verify_token_type(payload, "access"):
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user and user.is_active:
            return user
        return None

    except Exception:
        return None

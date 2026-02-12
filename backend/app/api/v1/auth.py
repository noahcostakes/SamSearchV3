"""Authentication endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_token_from_header
from app.core.encryption import encryption
from app.core.logging_config import get_logger
from app.core.security import (
    create_tokens,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)
from app.db.session import get_db, get_redis
from app.models.user import User
from app.schemas.user import (
    RefreshTokenRequest,
    SAMKeyUpdate,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.token_blacklist import TokenBlacklist

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Auth endpoint rate limits (per IP)
_AUTH_RATE_LIMIT_WINDOW = 900  # 15 minutes
_AUTH_LOGIN_MAX = 10  # max login attempts per window
_AUTH_REGISTER_MAX = 5  # max registration attempts per window


async def _check_auth_rate_limit(
    redis: Redis, request: Request, action: str, max_attempts: int
) -> None:
    """Rate-limit auth endpoints by client IP."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"ratelimit:auth:{action}:{client_ip}"
    try:
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, _AUTH_RATE_LIMIT_WINDOW)
        if current > max_attempts:
            logger.warning(
                "Auth rate limit exceeded",
                extra={"action": action, "ip": client_ip},
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please try again later.",
            )
    except HTTPException:
        raise
    except Exception as e:
        # Fail open — don't block auth if Redis is down
        logger.error("Auth rate limit check failed", extra={"error": str(e)})


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    """Register a new user account."""
    await _check_auth_rate_limit(redis, request, "register", _AUTH_REGISTER_MAX)

    logger.info("Registration attempt", extra={"email_domain": user_data.email.split("@")[-1]})

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        logger.warning("Registration failed - email exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user with hashed password
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("User registered", extra={"user_id": user.id})
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> TokenResponse:
    """Login and receive access/refresh tokens."""
    await _check_auth_rate_limit(redis, request, "login", _AUTH_LOGIN_MAX)

    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    # Verify credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        logger.warning("Failed login attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Create tokens
    access_token, refresh_token = create_tokens(user.id)

    logger.info("User logged in", extra={"user_id": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    token: str = Depends(get_token_from_header),
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
) -> dict:
    """Logout and invalidate all user tokens."""
    blacklist = TokenBlacklist(redis)

    # Mark logout time (invalidates all tokens issued before now)
    logout_timestamp = int(datetime.now(timezone.utc).timestamp())
    await blacklist.add_user_logout(current_user.id, logout_timestamp)

    logger.info("User logged out", extra={"user_id": current_user.id})

    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> TokenResponse:
    """Refresh access token using refresh token."""
    # Decode refresh token
    payload = decode_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Verify it's a refresh token
    if not verify_token_type(payload, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    # Check blacklist
    user_id = payload.get("sub")
    token_iat = payload.get("iat")
    if not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    if isinstance(token_iat, datetime):
        token_iat = int(token_iat.timestamp())

    blacklist = TokenBlacklist(redis)
    is_valid = await blacklist.verify_token_not_blacklisted(
        request.refresh_token, user_id, token_iat
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled",
        )

    # Revoke the current refresh token to prevent replay.
    exp = payload.get("exp")
    now_ts = int(datetime.now(timezone.utc).timestamp())
    if isinstance(exp, datetime):
        exp_ts = int(exp.timestamp())
    elif isinstance(exp, (int, float)):
        exp_ts = int(exp)
    else:
        exp_ts = now_ts + 60
    expires_in = max(1, exp_ts - now_ts)
    await blacklist.add_token(request.refresh_token, expires_in)

    # Create new token pair
    access_token, new_refresh_token = create_tokens(user.id)

    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current user information."""
    return current_user


@router.get("/sam-key/status", status_code=status.HTTP_200_OK)
async def get_sam_api_key_status(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get status of user's SAM.gov API key."""
    has_key = current_user.sam_api_key_encrypted is not None
    expires_at = current_user.sam_api_key_expires_at.isoformat() if current_user.sam_api_key_expires_at else None
    
    return {
        "has_key": has_key,
        "expires_at": expires_at,
    }


@router.put("/sam-key", status_code=status.HTTP_200_OK)
async def update_sam_api_key(
    key_data: SAMKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update user's SAM.gov API key (encrypted at rest)."""
    # Encrypt the API key
    encrypted_key = encryption.encrypt(key_data.api_key)

    # Update user
    current_user.sam_api_key_encrypted = encrypted_key
    current_user.sam_api_key_expires_at = key_data.expires_at

    await db.commit()

    logger.info("SAM API key updated", extra={"user_id": current_user.id})

    return {"message": "SAM.gov API key updated successfully"}


@router.delete("/sam-key", status_code=status.HTTP_200_OK)
async def delete_sam_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete user's SAM.gov API key."""
    current_user.sam_api_key_encrypted = None
    current_user.sam_api_key_expires_at = None

    await db.commit()

    logger.info("SAM API key deleted", extra={"user_id": current_user.id})

    return {"message": "SAM.gov API key deleted"}

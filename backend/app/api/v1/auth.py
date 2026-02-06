"""Authentication endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Register a new user account."""
    logger.info(f"Registration attempt for: {user_data.email}")
    
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        logger.warning(f"Registration failed - email exists: {user_data.email}")
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

    logger.info(f"User registered: {user.email}")

    # Transform to response (add has_sam_api_key field)
    return User(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        is_verified=user.is_verified,
        sam_api_key_encrypted=user.sam_api_key_encrypted,
        sam_api_key_expires_at=user.sam_api_key_expires_at,
        created_at=user.created_at,
        hashed_password=user.hashed_password,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Login and receive access/refresh tokens."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    # Verify credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {credentials.email}")
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

    logger.info(f"User logged in: {user.email}")

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

    logger.info(f"User logged out: {current_user.email}")

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

    logger.info(f"SAM API key updated for user: {current_user.email}")

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

    logger.info(f"SAM API key deleted for user: {current_user.email}")

    return {"message": "SAM.gov API key deleted"}

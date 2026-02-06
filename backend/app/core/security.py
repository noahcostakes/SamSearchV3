"""Security utilities for password hashing and JWT tokens."""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.config import settings

# Password hashing with Argon2id
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hash password with Argon2id."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return password_hasher.verify(plain_password, hashed_password)


def create_access_token(user_id: str) -> str:
    """Create short-lived access token."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(user_id: str) -> str:
    """Create long-lived refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_tokens(user_id: str) -> Tuple[str, str]:
    """Create access and refresh token pair."""
    return create_access_token(user_id), create_refresh_token(user_id)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify JWT token without blacklist check."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def verify_token_type(payload: dict, expected_type: str) -> bool:
    """Verify the token type matches expected."""
    return payload.get("type") == expected_type

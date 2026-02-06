"""User-related Pydantic schemas."""
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password meets minimum requirements."""
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (excludes sensitive data)."""

    id: str
    email: str
    is_active: bool
    is_verified: bool
    has_sam_api_key: bool
    sam_api_key_expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for authentication tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class SAMKeyUpdate(BaseModel):
    """Schema for updating SAM.gov API key."""

    api_key: str = Field(..., min_length=20, max_length=200)
    expires_at: Optional[datetime] = None

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Basic validation for SAM.gov API key format."""
        v = v.strip()
        if not v:
            raise ValueError("API key cannot be empty")
        return v

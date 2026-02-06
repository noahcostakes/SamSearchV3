"""User model for authentication and account management."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Encrypted SAM.gov API key
    sam_api_key_encrypted: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sam_api_key_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Usage tracking
    searches_this_month: Mapped[int] = mapped_column(Integer, default=0)
    last_search_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    profile: Mapped["CompanyProfile"] = relationship(
        "CompanyProfile", back_populates="user", uselist=False
    )
    searches: Mapped[list["SearchHistory"]] = relationship(
        "SearchHistory", back_populates="user"
    )
    saved_opportunities: Mapped[list["SavedOpportunity"]] = relationship(
        "SavedOpportunity", back_populates="user"
    )

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_created_at", "created_at"),
    )


# Import here to avoid circular imports
from app.models.profile import CompanyProfile
from app.models.search import SearchHistory, SavedOpportunity

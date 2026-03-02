"""Search history and saved opportunities models."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import JSONType

if TYPE_CHECKING:
    from app.models.user import User


class SearchHistory(Base):
    """Record of user searches and their results."""

    __tablename__ = "search_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    # Search parameters
    search_params: Mapped[dict] = mapped_column(JSONType, nullable=False)

    # Results summary
    total_results: Mapped[int] = mapped_column(Integer, default=0)
    high_relevance_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_relevance_count: Mapped[int] = mapped_column(Integer, default=0)
    low_relevance_count: Mapped[int] = mapped_column(Integer, default=0)

    # Job tracking
    job_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    job_status: Mapped[str] = mapped_column(String(20), default="pending")

    # Cached results (for quick retrieval)
    cached_results: Mapped[dict | None] = mapped_column(JSONType, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="searches")

    __table_args__ = (
        Index("idx_search_history_user_id", "user_id"),
        Index("idx_search_history_created_at", "created_at"),
        Index("idx_search_history_job_id", "job_id"),
        Index("idx_search_history_user_created", "user_id", "created_at"),
    )


class SavedOpportunity(Base):
    """Opportunities saved by users for later review."""

    __tablename__ = "saved_opportunities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    # SAM.gov opportunity data
    notice_id: Mapped[str] = mapped_column(String(100), nullable=False)
    solicitation_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    agency: Mapped[str | None] = mapped_column(String(200), nullable=True)
    posted_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    response_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # AI scoring data
    relevance_score: Mapped[int] = mapped_column(Integer, default=0)
    ai_analysis: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # User notes
    user_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_status: Mapped[str] = mapped_column(String(20), default="saved")

    # Full opportunity data
    opportunity_data: Mapped[dict] = mapped_column(JSONType, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="saved_opportunities")

    __table_args__ = (
        Index("idx_saved_opps_user_id", "user_id"),
        Index("idx_saved_opps_notice_id", "notice_id"),
        Index("idx_saved_opps_user_status", "user_id", "user_status"),
    )

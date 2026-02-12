"""Company profile model for storing business information."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import JSONType

if TYPE_CHECKING:
    from app.models.user import User


class CompanyProfile(Base):
    """Company profile for contract matching."""

    __tablename__ = "company_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), unique=True, nullable=False
    )

    # Basic Info
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # SAM.gov Registration (Phase 2)
    cage_code: Mapped[str | None] = mapped_column(String(5), nullable=True)
    uei_number: Mapped[str | None] = mapped_column(String(12), nullable=True)
    duns_number: Mapped[str | None] = mapped_column(String(9), nullable=True)

    # NAICS codes
    primary_naics: Mapped[str] = mapped_column(String(6), nullable=False)
    secondary_naics: Mapped[list] = mapped_column(JSONType, default=list)

    # Capabilities
    core_competencies: Mapped[list] = mapped_column(JSONType, nullable=False)
    technical_skills: Mapped[list] = mapped_column(JSONType, default=list)
    
    # Past Performance (Phase 1)
    past_performance_keywords: Mapped[list] = mapped_column(JSONType, default=list)
    priority_keywords: Mapped[list] = mapped_column(JSONType, default=list)

    # Certifications
    certifications: Mapped[list] = mapped_column(JSONType, default=list)
    
    # Security Clearance (Phase 1)
    clearance_level: Mapped[str] = mapped_column(String(20), default="None")

    # Preferences
    target_contract_min: Mapped[int] = mapped_column(Integer, default=25000)
    target_contract_max: Mapped[int] = mapped_column(Integer, default=2000000)
    preferred_agencies: Mapped[list] = mapped_column(JSONType, default=list)
    service_area: Mapped[list] = mapped_column(JSONType, default=list)
    max_response_days: Mapped[int] = mapped_column(Integer, default=30)
    
    # Contract Preferences (Phase 1)
    contract_types_preference: Mapped[list] = mapped_column(JSONType, default=list)
    open_to_subcontracting: Mapped[bool] = mapped_column(Boolean, default=True)
    open_to_prime_contracting: Mapped[bool] = mapped_column(Boolean, default=True)

    # Constraints
    blacklist_keywords: Mapped[list] = mapped_column(JSONType, default=list)
    requires_clearance: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")

    __table_args__ = (
        Index("idx_profiles_user_id", "user_id"),
        Index("idx_profiles_primary_naics", "primary_naics"),
    )

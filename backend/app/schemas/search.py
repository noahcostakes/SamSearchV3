"""Search and opportunity Pydantic schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Schema for starting a search."""

    days_back: int = Field(30, ge=1, le=365)


class SearchStatusResponse(BaseModel):
    """Schema for search job status response."""

    status: str
    progress: int = 0
    total_opportunities: Optional[int] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AIScoreDetail(BaseModel):
    """Schema for AI scoring details."""

    relevance: int = Field(..., ge=0, le=100)
    confidence: int = Field(..., ge=0, le=100)
    recommendation: str  # "bid", "watch", "skip"
    reasoning: str
    strengths: List[str]
    weaknesses: List[str]
    key_requirements: List[str]


class OpportunityResponse(BaseModel):
    """Schema for a single opportunity."""

    notice_id: str
    title: str
    solicitation_number: Optional[str] = None
    department: Optional[str] = None
    sub_tier: Optional[str] = None
    office: Optional[str] = None

    posted_date: Optional[datetime] = None
    response_deadline: Optional[datetime] = None
    archive_date: Optional[datetime] = None

    type: Optional[str] = None
    base_type: Optional[str] = None
    set_aside_description: Optional[str] = None
    naics_code: Optional[str] = None

    description: Optional[str] = None
    place_of_performance: Optional[Dict[str, Any]] = None

    # AI scoring
    score: Optional[AIScoreDetail] = None

    # Original data
    raw_data: Optional[Dict[str, Any]] = None


class SaveOpportunityRequest(BaseModel):
    """Schema for saving an opportunity."""

    notice_id: str
    opportunity_data: Dict[str, Any]
    relevance_score: int = Field(0, ge=0, le=100)
    ai_analysis: Optional[Dict[str, Any]] = None
    recommendation: Optional[str] = None
    user_notes: Optional[str] = None


class UpdateSavedOpportunityRequest(BaseModel):
    """Schema for updating a saved opportunity (notes and/or status)."""

    user_notes: Optional[str] = None
    user_status: Optional[str] = Field(
        None, description="Status: saved, pursuing, or passed"
    )


class SavedOpportunityResponse(BaseModel):
    """Schema for saved opportunity response."""

    id: str
    user_id: str
    notice_id: str
    solicitation_number: Optional[str]
    title: str
    agency: Optional[str]
    posted_date: Optional[datetime]
    response_deadline: Optional[datetime]

    relevance_score: int
    ai_analysis: Optional[Dict[str, Any]]
    recommendation: Optional[str]

    user_notes: Optional[str]
    user_status: str

    opportunity_data: Dict[str, Any]

    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SearchHistoryResponse(BaseModel):
    """Schema for search history item."""

    id: str
    job_id: Optional[str] = None
    search_params: Dict[str, Any]
    total_results: int
    high_relevance_count: int
    medium_relevance_count: int
    low_relevance_count: int
    job_status: str
    created_at: datetime

    class Config:
        from_attributes = True

"""Search endpoints for SAM.gov opportunities."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.logging_config import get_logger
from app.db.session import get_db, get_redis
from app.models.profile import CompanyProfile
from app.models.search import SavedOpportunity, SearchHistory
from app.models.user import User
from app.schemas.search import (
    SavedOpportunityResponse,
    SaveOpportunityRequest,
    SearchHistoryResponse,
    SearchRequest,
)
from app.services.usage_tracker import UsageTracker
from app.tasks.scoring_tasks import score_opportunities_task

logger = get_logger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.post("/start", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def start_search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> dict:
    """
    Start a background search job.

    Returns job ID for status polling.
    """
    # Check user has SAM API key
    if not current_user.sam_api_key_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add your SAM.gov API key in settings first",
        )

    # Get user's profile
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create a company profile first",
        )

    # Check rate limits
    usage_tracker = UsageTracker(redis)
    allowed, error_message = await usage_tracker.check_user_search_limits(current_user.id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message,
        )

    # Create search history record
    search_history = SearchHistory(
        user_id=current_user.id,
        search_params={"days_back": request.days_back},
        job_status="pending",
    )
    db.add(search_history)
    await db.commit()
    await db.refresh(search_history)

    # Start background job
    job = score_opportunities_task.delay(
        user_id=current_user.id,
        profile_id=profile.id,
        search_history_id=search_history.id,
        days_back=request.days_back,
    )

    # Update search history with job ID
    search_history.job_id = job.id
    await db.commit()

    # Increment usage counter
    await usage_tracker.increment_user_search(current_user.id)

    logger.info(
        f"Search started for user: {current_user.email}",
        extra={"job_id": job.id, "days_back": request.days_back},
    )

    return {
        "job_id": job.id,
        "search_id": search_history.id,
        "status": "started",
        "check_status_url": f"/api/v1/jobs/{job.id}/status",
    }


@router.get("/history", response_model=List[SearchHistoryResponse])
async def get_search_history(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SearchHistory]:
    """Get user's search history."""
    result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get("/history/{search_id}", response_model=dict)
async def get_search_results(
    search_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get cached results for a specific search."""
    result = await db.execute(
        select(SearchHistory).where(
            SearchHistory.id == search_id,
            SearchHistory.user_id == current_user.id,
        )
    )
    search = result.scalar_one_or_none()

    if not search:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search not found",
        )

    return {
        "id": search.id,
        "status": search.job_status,
        "search_params": search.search_params,
        "total_results": search.total_results,
        "high_relevance_count": search.high_relevance_count,
        "medium_relevance_count": search.medium_relevance_count,
        "low_relevance_count": search.low_relevance_count,
        "results": search.cached_results,
        "created_at": search.created_at.isoformat(),
    }


@router.post("/save", response_model=SavedOpportunityResponse, status_code=status.HTTP_201_CREATED)
async def save_opportunity(
    request: SaveOpportunityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedOpportunity:
    """Save an opportunity for later review."""
    # Check if already saved
    result = await db.execute(
        select(SavedOpportunity).where(
            SavedOpportunity.user_id == current_user.id,
            SavedOpportunity.notice_id == request.notice_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Opportunity already saved",
        )

    # Extract key fields from opportunity data
    opp_data = request.opportunity_data
    saved = SavedOpportunity(
        user_id=current_user.id,
        notice_id=request.notice_id,
        solicitation_number=opp_data.get("solicitationNumber"),
        title=opp_data.get("title", "Untitled"),
        agency=opp_data.get("department"),
        posted_date=opp_data.get("postedDate"),
        response_deadline=opp_data.get("responseDeadLine"),
        relevance_score=request.relevance_score,
        ai_analysis=request.ai_analysis,
        recommendation=request.recommendation,
        user_notes=request.user_notes,
        opportunity_data=request.opportunity_data,
    )

    db.add(saved)
    await db.commit()
    await db.refresh(saved)

    logger.info(f"Opportunity saved: {request.notice_id} for user: {current_user.email}")

    return saved


@router.get("/saved", response_model=List[SavedOpportunityResponse])
async def get_saved_opportunities(
    status_filter: str = Query(None, description="Filter by status: saved, pursuing, passed"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SavedOpportunity]:
    """Get user's saved opportunities."""
    query = select(SavedOpportunity).where(SavedOpportunity.user_id == current_user.id)

    if status_filter:
        query = query.where(SavedOpportunity.user_status == status_filter)

    query = query.order_by(SavedOpportunity.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.put("/saved/{opportunity_id}", response_model=SavedOpportunityResponse)
async def update_saved_opportunity(
    opportunity_id: str,
    user_notes: str = None,
    user_status: str = Query(None, description="Status: saved, pursuing, passed"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedOpportunity:
    """Update a saved opportunity (notes, status)."""
    result = await db.execute(
        select(SavedOpportunity).where(
            SavedOpportunity.id == opportunity_id,
            SavedOpportunity.user_id == current_user.id,
        )
    )
    saved = result.scalar_one_or_none()

    if not saved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved opportunity not found",
        )

    if user_notes is not None:
        saved.user_notes = user_notes
    if user_status is not None:
        if user_status not in ["saved", "pursuing", "passed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be: saved, pursuing, or passed",
            )
        saved.user_status = user_status

    await db.commit()
    await db.refresh(saved)

    return saved


@router.delete("/saved/{opportunity_id}", status_code=status.HTTP_200_OK)
async def delete_saved_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a saved opportunity."""
    result = await db.execute(
        select(SavedOpportunity).where(
            SavedOpportunity.id == opportunity_id,
            SavedOpportunity.user_id == current_user.id,
        )
    )
    saved = result.scalar_one_or_none()

    if not saved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved opportunity not found",
        )

    await db.delete(saved)
    await db.commit()

    return {"message": "Opportunity removed from saved list"}

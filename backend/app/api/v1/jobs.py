"""Background job status endpoints."""
from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.logging_config import get_logger
from app.db.session import get_db
from app.models.search import SearchHistory
from app.models.user import User
from app.schemas.search import SearchStatusResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}/status", response_model=SearchStatusResponse)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SearchStatusResponse:
    """
    Get status of a background job.

    Poll this endpoint to check search progress.
    """
    # Ensure the job belongs to the authenticated user.
    result = await db.execute(
        select(SearchHistory.id).where(
            SearchHistory.job_id == job_id,
            SearchHistory.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    job = AsyncResult(job_id)

    if job.state == "PENDING":
        return SearchStatusResponse(
            status="pending",
            progress=0,
        )

    elif job.state == "SEARCHING":
        meta = job.info or {}
        return SearchStatusResponse(
            status="searching",
            progress=meta.get("progress", 10),
        )

    elif job.state == "SCORING":
        meta = job.info or {}
        return SearchStatusResponse(
            status="scoring",
            progress=meta.get("progress", 50),
            total_opportunities=meta.get("total_opportunities"),
        )

    elif job.state == "SUCCESS":
        return SearchStatusResponse(
            status="complete",
            progress=100,
            results=job.result,
        )

    elif job.state == "FAILURE":
        error_msg = str(job.info) if job.info else "Unknown error"
        return SearchStatusResponse(
            status="failed",
            progress=0,
            error=error_msg,
        )

    else:
        # STARTED, RETRY, etc.
        return SearchStatusResponse(
            status=job.state.lower(),
            progress=5,
        )


@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Cancel a running background job.

    Note: This may not immediately stop already-running tasks.
    """
    # Ensure the job belongs to the authenticated user.
    result = await db.execute(
        select(SearchHistory.id).where(
            SearchHistory.job_id == job_id,
            SearchHistory.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    job = AsyncResult(job_id)

    if job.state in ["SUCCESS", "FAILURE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job has already completed",
        )

    job.revoke(terminate=True)

    logger.info(f"Job cancelled: {job_id} by user: {current_user.email}")

    return {"message": "Job cancellation requested"}

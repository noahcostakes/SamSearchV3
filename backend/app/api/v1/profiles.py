"""Profile management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.logging_config import get_logger
from app.db.session import get_db
from app.models.profile import CompanyProfile
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

logger = get_logger(__name__)
router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompanyProfile:
    """Create a company profile for the current user."""
    # Check if user already has a profile
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists. Use PUT to update.",
        )

    # Create profile
    profile = CompanyProfile(
        user_id=current_user.id,
        **profile_data.model_dump(),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    logger.info(f"Profile created for user: {current_user.email}")

    return profile


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompanyProfile:
    """Get the current user's company profile."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create one first.",
        )

    return profile


@router.put("", response_model=ProfileResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompanyProfile:
    """Update the current user's company profile (or create if doesn't exist)."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # Create new profile with provided data and defaults
        create_data = profile_data.model_dump(exclude_unset=True)
        # Apply defaults for required fields if not provided
        defaults = {
            "company_name": "My Company",
            "employee_count": 1,
            "headquarters_state": "CA",
            "primary_naics": "541511",  # Custom Computer Programming Services
            "core_competencies": ["General Services"],
        }
        for key, value in defaults.items():
            if key not in create_data or create_data[key] is None:
                create_data[key] = value
        
        profile = CompanyProfile(
            user_id=current_user.id,
            **create_data,
        )
        db.add(profile)
        logger.info(f"Profile created for user: {current_user.email}")
    else:
        # Update only provided fields
        update_data = profile_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        logger.info(f"Profile updated for user: {current_user.email}")

    await db.commit()
    await db.refresh(profile)

    return profile


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete the current user's company profile."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    await db.delete(profile)
    await db.commit()

    logger.info(f"Profile deleted for user: {current_user.email}")

    return {"message": "Profile deleted successfully"}

"""Background tasks for opportunity scoring."""
import asyncio
from typing import Any, Dict

from celery import Task
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.encryption import encryption
from app.core.logging_config import get_logger
from app.db.base import Base
from app.models.profile import CompanyProfile
from app.models.search import SearchHistory
from app.models.user import User
from app.services.ai_scorer import AIScorer
from app.services.sam_client import SAMClient, SAMClientError
from app.tasks.celery_app import celery_app

# Create sync engine for Celery workers
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logger = get_logger(__name__)

# Convert async URL to sync for Celery
sync_db_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_db_url, pool_size=5)
SyncSession = sessionmaker(sync_engine)


class CallbackTask(Task):
    """Task with callback support for logging."""

    def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict) -> None:
        logger.info(f"Task {task_id} succeeded")

    def on_failure(
        self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any
    ) -> None:
        logger.error(f"Task {task_id} failed: {exc}")


@celery_app.task(base=CallbackTask, bind=True, name="tasks.score_opportunities")
def score_opportunities_task(
    self,
    user_id: str,
    profile_id: str,
    search_history_id: str,
    days_back: int = 30,
) -> Dict[str, Any]:
    """
    Background task to search SAM.gov and score opportunities with AI.

    Args:
        user_id: User ID for fetching API key
        profile_id: Company profile ID
        search_history_id: Search history record ID
        days_back: Days to search back

    Returns:
        dict: Search results with scored opportunities
    """
    db = SyncSession()

    try:
        # Update task state
        self.update_state(state="SEARCHING", meta={"progress": 10})

        # Fetch user and profile
        user = db.execute(select(User).where(User.id == user_id)).scalar_one()
        profile = db.execute(
            select(CompanyProfile).where(CompanyProfile.id == profile_id)
        ).scalar_one()
        search_history = db.execute(
            select(SearchHistory).where(SearchHistory.id == search_history_id)
        ).scalar_one()

        # Decrypt SAM.gov API key
        if not user.sam_api_key_encrypted:
            raise ValueError("No SAM.gov API key configured")

        sam_api_key = encryption.decrypt(user.sam_api_key_encrypted)

        # Build profile dict for search
        profile_dict = {
            "company_name": profile.company_name,
            "primary_naics": profile.primary_naics,
            "secondary_naics": profile.secondary_naics or [],
            "core_competencies": profile.core_competencies,
            "technical_skills": profile.technical_skills or [],
            "certifications": profile.certifications or [],
            "service_area": profile.service_area or [],
            "target_contract_min": profile.target_contract_min,
            "target_contract_max": profile.target_contract_max,
            "blacklist_keywords": profile.blacklist_keywords or [],
            # New fields for enhanced matching
            "past_performance_keywords": profile.past_performance_keywords or [],
            "priority_keywords": profile.priority_keywords or [],
            "clearance_level": profile.clearance_level or "None",
            "contract_types_preference": profile.contract_types_preference or [],
            "open_to_subcontracting": profile.open_to_subcontracting,
            "open_to_prime_contracting": profile.open_to_prime_contracting,
            "cage_code": profile.cage_code,
            "uei_number": profile.uei_number,
            "duns_number": profile.duns_number,
        }

        # Search SAM.gov (run async code in sync context)
        self.update_state(state="SEARCHING", meta={"progress": 30})

        async def do_search():
            sam_client = SAMClient(sam_api_key)
            try:
                return await sam_client.search_for_profile(profile_dict, days_back=days_back)
            finally:
                await sam_client.close()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(do_search())
        finally:
            loop.close()

        opportunities = results.get("opportunitiesData", [])
        total_records = results.get("totalRecords", 0)

        self.update_state(
            state="SCORING",
            meta={"progress": 50, "total_opportunities": len(opportunities)},
        )

        # Score with AI
        scored_opportunities = []
        if opportunities:
            ai_scorer = AIScorer()
            scored_opportunities = ai_scorer.score_opportunities(
                profile_dict, opportunities
            )

            # Sort by relevance score
            scored_opportunities.sort(
                key=lambda x: x.get("score", {}).get("relevance", 0), reverse=True
            )

        # Calculate relevance counts
        high_count = sum(
            1 for o in scored_opportunities
            if o.get("score", {}).get("relevance", 0) >= 70
        )
        medium_count = sum(
            1 for o in scored_opportunities
            if 50 <= o.get("score", {}).get("relevance", 0) < 70
        )
        low_count = sum(
            1 for o in scored_opportunities
            if o.get("score", {}).get("relevance", 0) < 50
        )

        # Update search history
        search_history.total_results = total_records
        search_history.high_relevance_count = high_count
        search_history.medium_relevance_count = medium_count
        search_history.low_relevance_count = low_count
        search_history.job_status = "complete"
        search_history.cached_results = {
            "totalRecords": total_records,
            "opportunities": scored_opportunities[:100],  # Cache top 100
            "searchParams": {"days_back": days_back},
        }
        db.commit()

        self.update_state(state="COMPLETE", meta={"progress": 100})

        return {
            "totalRecords": total_records,
            "opportunities": scored_opportunities,
            "searchParams": {"days_back": days_back},
            "high_relevance_count": high_count,
            "medium_relevance_count": medium_count,
            "low_relevance_count": low_count,
        }

    except SAMClientError as e:
        logger.error(f"SAM.gov error in task: {e}")
        # Update search history with error
        search_history = db.execute(
            select(SearchHistory).where(SearchHistory.id == search_history_id)
        ).scalar_one_or_none()
        if search_history:
            search_history.job_status = "failed"
            db.commit()
        raise

    except Exception as e:
        logger.exception(f"Scoring task failed: {e}")
        # Update search history with error
        try:
            search_history = db.execute(
                select(SearchHistory).where(SearchHistory.id == search_history_id)
            ).scalar_one_or_none()
            if search_history:
                search_history.job_status = "failed"
                db.commit()
        except Exception:
            pass
        raise

    finally:
        db.close()

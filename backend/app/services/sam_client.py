"""SAM.gov API client with correct parameter names and date formats."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class SAMClientError(Exception):
    """Base exception for SAM client errors."""

    pass


class SAMRateLimitError(SAMClientError):
    """Rate limit exceeded."""

    pass


class SAMAuthError(SAMClientError):
    """Authentication error (invalid API key)."""

    pass


class SAMClient:
    """
    SAM.gov API client with CORRECT parameter names.

    CRITICAL: SAM.gov uses non-standard parameter names:
    - ptype (NOT noticeType)
    - ncode (NOT naicsCode)
    - typeOfSetAside (NOT setAside)
    - postedFrom/postedTo in MM/DD/YYYY format (NOT YYYY-MM-DD)
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = settings.SAM_API_BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()

    def _format_date(self, dt: datetime) -> str:
        """
        Format datetime to SAM.gov required format: MM/DD/YYYY

        CRITICAL: SAM.gov REQUIRES this exact format. YYYY-MM-DD will fail!
        """
        return dt.strftime("%m/%d/%Y")

    async def search(
        self,
        posted_from: datetime,
        posted_to: datetime,
        naics_codes: Optional[List[str]] = None,
        keywords: Optional[str] = None,
        ptype: Optional[str] = None,
        set_aside: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Search SAM.gov opportunities.

        Args:
            posted_from: Start date for posted date range
            posted_to: End date for posted date range
            naics_codes: List of NAICS codes to filter by
            keywords: Keywords to search in title
            ptype: Opportunity types (o=solicitation, k=contract award, etc.)
            set_aside: Set-aside type (SBA, 8A, HUBZone, etc.)
            state: State code for place of performance
            limit: Max results (1000 max)
            offset: Pagination offset

        Returns:
            Dict with opportunitiesData and totalRecords
        """
        # Build params with CORRECT SAM.gov parameter names
        params: Dict[str, Any] = {
            "api_key": self.api_key,
            "postedFrom": self._format_date(posted_from),
            "postedTo": self._format_date(posted_to),
            "limit": min(limit, 1000),
            "offset": offset,
        }

        # Add optional parameters with CORRECT names
        if naics_codes:
            # CORRECT: ncode (NOT naicsCode)
            params["ncode"] = ",".join(naics_codes)

        if keywords:
            params["title"] = keywords

        if ptype:
            # CORRECT: ptype (NOT noticeType)
            params["ptype"] = ptype

        if set_aside:
            # CORRECT: typeOfSetAside (NOT setAside)
            params["typeOfSetAside"] = set_aside

        if state:
            params["state"] = state

        logger.info(
            f"Searching SAM.gov",
            extra={
                "posted_from": params["postedFrom"],
                "posted_to": params["postedTo"],
                "naics": params.get("ncode"),
            },
        )

        try:
            response = await self.client.get(self.base_url, params=params)
            response.raise_for_status()

            data = response.json()
            total_records = data.get("totalRecords", 0)
            opportunities = data.get("opportunitiesData", [])

            logger.info(
                f"SAM.gov search complete",
                extra={"total_records": total_records, "returned": len(opportunities)},
            )

            return data

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.error("SAM.gov rate limit exceeded")
                raise SAMRateLimitError("Daily rate limit reached. Resets at midnight EST")
            elif e.response.status_code == 401:
                logger.error("SAM.gov authentication failed")
                raise SAMAuthError("Invalid SAM.gov API key")
            else:
                logger.error(f"SAM.gov HTTP error: {e.response.status_code}")
                raise SAMClientError(f"SAM.gov API error: {e.response.status_code}")

        except httpx.TimeoutException:
            logger.error("SAM.gov request timeout")
            raise SAMClientError("SAM.gov API timeout")

        except Exception as e:
            logger.exception(f"SAM.gov unexpected error: {e}")
            raise SAMClientError(f"Unexpected error: {str(e)}")

    async def search_all_pages(
        self,
        posted_from: datetime,
        posted_to: datetime,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Search SAM.gov with pagination to get all results.

        Returns list of all opportunities across pages.
        """
        all_opportunities: List[Dict[str, Any]] = []
        offset = 0
        limit = 1000

        while True:
            result = await self.search(
                posted_from=posted_from,
                posted_to=posted_to,
                limit=limit,
                offset=offset,
                **kwargs,
            )

            opportunities = result.get("opportunitiesData", [])
            all_opportunities.extend(opportunities)

            # Check if we got all results
            if len(opportunities) < limit:
                break

            offset += limit

            # Safety limit to prevent infinite loops
            if offset > 10000:
                logger.warning("Reached pagination safety limit")
                break

        return all_opportunities

    async def search_for_profile(
        self,
        profile: Dict[str, Any],
        days_back: int = 30,
    ) -> Dict[str, Any]:
        """
        Search SAM.gov based on company profile.

        Args:
            profile: Company profile dictionary
            days_back: Number of days to search back

        Returns:
            Dict with opportunitiesData and totalRecords
        """
        # Calculate date range
        posted_to = datetime.now(timezone.utc)
        posted_from = posted_to - timedelta(days=days_back)

        # Build NAICS list
        naics_codes = [profile["primary_naics"]]
        if profile.get("secondary_naics"):
            naics_codes.extend(profile["secondary_naics"][:4])  # Limit to 5 total

        # Determine ptype (opportunity types)
        # o=solicitation, p=presolicitation, k=combined synopsis/solicitation
        ptype = "o,p,k"

        # Build set-aside filter based on certifications
        set_aside = None
        certs = profile.get("certifications", [])
        if "8(a)" in certs:
            set_aside = "8A"
        elif "HUBZone" in certs:
            set_aside = "HZC"
        elif "WOSB" in certs or "EDWOSB" in certs:
            set_aside = "WOSB"
        elif "SDVOSB" in certs:
            set_aside = "SDVOSB"

        # Get state filter from service area
        state = None
        service_area = profile.get("service_area", [])
        if len(service_area) == 1:
            state = service_area[0]
        
        # Build keywords from priority keywords (highest weight) and past performance
        keywords = None
        priority_keywords = profile.get("priority_keywords", [])
        past_perf_keywords = profile.get("past_performance_keywords", [])
        
        # Combine keywords, prioritizing priority_keywords first
        all_keywords = priority_keywords[:3]  # Take top 3 priority keywords
        if len(all_keywords) < 3 and past_perf_keywords:
            # Fill with past performance if we have room
            all_keywords.extend(past_perf_keywords[:3 - len(all_keywords)])
        
        if all_keywords:
            # Join with OR logic for SAM.gov search
            keywords = " OR ".join(all_keywords)
            logger.info(f"Using search keywords: {keywords}")

        return await self.search(
            posted_from=posted_from,
            posted_to=posted_to,
            naics_codes=naics_codes,
            keywords=keywords,
            ptype=ptype,
            set_aside=set_aside,
            state=state,
        )

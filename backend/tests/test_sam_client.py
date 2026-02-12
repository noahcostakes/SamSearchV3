"""Tests for SAM.gov client with correct parameter names."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.sam_client import SAMClient, SAMRateLimitError, SAMAuthError


class TestSAMClient:
    """Test SAM.gov API client."""

    @pytest.fixture
    def client(self):
        """Create a SAM client instance."""
        return SAMClient(api_key="test-api-key")

    def test_date_format_correct(self, client: SAMClient):
        """Dates must be formatted as MM/DD/YYYY."""
        dt = datetime(2024, 1, 15)
        formatted = client._format_date(dt)
        assert formatted == "01/15/2024"

    def test_date_format_with_leading_zeros(self, client: SAMClient):
        """Date format includes leading zeros."""
        dt = datetime(2024, 12, 5)
        formatted = client._format_date(dt)
        assert formatted == "12/05/2024"

    @pytest.mark.asyncio
    async def test_search_uses_correct_param_names(self, client: SAMClient):
        """Search must use 'ncode' not 'naicsCode'."""
        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"opportunitiesData": [], "totalRecords": 0}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            await client.search(
                posted_from=datetime(2024, 1, 1),
                posted_to=datetime(2024, 1, 31),
                naics_codes=["541511"],
            )

            # Verify correct parameter names
            call_kwargs = mock_get.call_args[1]
            params = call_kwargs["params"]

            # CORRECT parameter names
            assert "ncode" in params
            assert params["ncode"] == "541511"

            # WRONG parameter names should NOT be present
            assert "naicsCode" not in params
            assert "noticeType" not in params

    @pytest.mark.asyncio
    async def test_search_date_format_in_params(self, client: SAMClient):
        """Verify dates are formatted as MM/DD/YYYY in API params."""
        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"opportunitiesData": [], "totalRecords": 0}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            await client.search(
                posted_from=datetime(2024, 1, 15),
                posted_to=datetime(2024, 2, 15),
            )

            params = mock_get.call_args[1]["params"]
            assert params["postedFrom"] == "01/15/2024"
            assert params["postedTo"] == "02/15/2024"

    @pytest.mark.asyncio
    async def test_search_set_aside_param_name(self, client: SAMClient):
        """Set-aside must use 'typeOfSetAside' not 'setAside'."""
        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"opportunitiesData": [], "totalRecords": 0}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            await client.search(
                posted_from=datetime(2024, 1, 1),
                posted_to=datetime(2024, 1, 31),
                set_aside="8A",
            )

            params = mock_get.call_args[1]["params"]
            assert "typeOfSetAside" in params
            assert params["typeOfSetAside"] == "8A"
            assert "setAside" not in params

    @pytest.mark.asyncio
    async def test_search_ptype_param_name(self, client: SAMClient):
        """Opportunity type must use 'ptype' not 'noticeType'."""
        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"opportunitiesData": [], "totalRecords": 0}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            await client.search(
                posted_from=datetime(2024, 1, 1),
                posted_to=datetime(2024, 1, 31),
                ptype="o,k",
            )

            params = mock_get.call_args[1]["params"]
            assert "ptype" in params
            assert params["ptype"] == "o,k"
            assert "noticeType" not in params

    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, client: SAMClient):
        """Should raise SAMRateLimitError for 429 response."""
        import httpx

        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            response = httpx.Response(429, request=httpx.Request("GET", "http://test"))
            mock_get.return_value.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Rate limited", request=response.request, response=response
            )

            with pytest.raises(SAMRateLimitError):
                await client.search(
                    posted_from=datetime(2024, 1, 1),
                    posted_to=datetime(2024, 1, 31),
                )

    @pytest.mark.asyncio
    async def test_auth_error_handling(self, client: SAMClient):
        """Should raise SAMAuthError for 401 response."""
        import httpx

        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            response = httpx.Response(401, request=httpx.Request("GET", "http://test"))
            mock_get.return_value.raise_for_status.side_effect = httpx.HTTPStatusError(
                "Unauthorized", request=response.request, response=response
            )

            with pytest.raises(SAMAuthError):
                await client.search(
                    posted_from=datetime(2024, 1, 1),
                    posted_to=datetime(2024, 1, 31),
                )

    @pytest.mark.asyncio
    async def test_pagination_for_large_results(self, client: SAMClient):
        """Should paginate when results exceed limit."""
        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            # First call returns 1000 results (full page)
            first_response = MagicMock()
            first_response.json.return_value = {
                "opportunitiesData": [{"id": i} for i in range(1000)],
                "totalRecords": 1200,
            }
            first_response.raise_for_status = MagicMock()

            # Second call returns 200 results (partial page)
            second_response = MagicMock()
            second_response.json.return_value = {
                "opportunitiesData": [{"id": i} for i in range(200)],
                "totalRecords": 1200,
            }
            second_response.raise_for_status = MagicMock()

            mock_get.side_effect = [first_response, second_response]

            results = await client.search_all_pages(
                posted_from=datetime(2024, 1, 1),
                posted_to=datetime(2024, 1, 31),
            )

            assert len(results) == 1200
            assert mock_get.call_count == 2

    @pytest.mark.asyncio
    async def test_api_key_in_params(self, client: SAMClient):
        """API key must be included in request params."""
        with patch.object(client.client, "get", new_callable=AsyncMock) as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"opportunitiesData": [], "totalRecords": 0}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            await client.search(
                posted_from=datetime(2024, 1, 1),
                posted_to=datetime(2024, 1, 31),
            )

            params = mock_get.call_args[1]["params"]
            assert "api_key" in params
            assert params["api_key"] == "test-api-key"

    @pytest.mark.asyncio
    async def test_search_for_profile_uses_single_naics_and_relaxes_filters(self, client: SAMClient):
        """Profile search should try one NAICS at a time and relax filters before broad fallback."""
        profile = {
            "primary_naics": "541511",
            "secondary_naics": ["541512", "518210"],
            "certifications": ["8(a)"],
            "service_area": ["VA"],
            "priority_keywords": ["cloud migration", "zero trust"],
            "past_performance_keywords": ["modernization"],
        }

        with patch.object(client, "search", new_callable=AsyncMock) as mock_search:
            mock_search.side_effect = [
                {"totalRecords": 0, "opportunitiesData": []},
                {"totalRecords": 0, "opportunitiesData": []},
                {
                    "totalRecords": 5,
                    "opportunitiesData": [{"noticeId": "n-1"}],
                },
            ]

            result = await client.search_for_profile(profile, days_back=30)

            assert result["totalRecords"] == 5
            assert len(result["opportunitiesData"]) == 1

            # First attempt: strict primary NAICS.
            first_call = mock_search.call_args_list[0].kwargs
            assert first_call["naics_codes"] == ["541511"]
            assert first_call["keywords"] == "cloud migration"
            assert first_call["ptype"] == "o,p,k"
            assert first_call["set_aside"] == "8A"
            assert first_call["state"] == "VA"

            # Second attempt: keep NAICS but relax keywords.
            second_call = mock_search.call_args_list[1].kwargs
            assert second_call["naics_codes"] == ["541511"]
            assert second_call["keywords"] is None
            assert second_call["set_aside"] == "8A"
            assert second_call["state"] == "VA"

            # Third attempt: relax NAICS context filters fully.
            third_call = mock_search.call_args_list[2].kwargs
            assert third_call["naics_codes"] == ["541511"]
            assert third_call["keywords"] is None
            assert third_call["set_aside"] is None
            assert third_call["state"] is None

    @pytest.mark.asyncio
    async def test_search_for_profile_falls_back_to_broad_query(self, client: SAMClient):
        """When NAICS-constrained attempts return nothing, fall back to broad ptype query."""
        profile = {
            "primary_naics": "541511",
            "secondary_naics": ["541512"],
            "certifications": [],
            "service_area": [],
            "priority_keywords": [],
            "past_performance_keywords": [],
        }

        with patch.object(client, "search", new_callable=AsyncMock) as mock_search:
            mock_search.side_effect = [
                {"totalRecords": 0, "opportunitiesData": []},
                {"totalRecords": 0, "opportunitiesData": []},
                {"totalRecords": 0, "opportunitiesData": []},
                {"totalRecords": 0, "opportunitiesData": []},
                {"totalRecords": 42, "opportunitiesData": [{"noticeId": "n-42"}]},
            ]

            result = await client.search_for_profile(profile, days_back=30)

            assert result["totalRecords"] == 42
            assert result["searchMetadata"]["strategy"] == "broad_ptype_only"

            final_call = mock_search.call_args_list[-1].kwargs
            assert final_call["naics_codes"] is None
            assert final_call["keywords"] is None
            assert final_call["set_aside"] is None
            assert final_call["state"] is None
            assert final_call["ptype"] == "o,p,k,r,s"

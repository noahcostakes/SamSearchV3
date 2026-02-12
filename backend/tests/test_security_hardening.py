"""Security regression tests for token and job authorization behavior."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search import SearchHistory
from app.services.token_blacklist import TokenBlacklist


@pytest.mark.asyncio
async def test_refresh_token_is_single_use(client: AsyncClient, user_data: dict):
    """Used refresh tokens should be revoked to prevent replay."""
    await client.post("/api/v1/auth/register", json=user_data)
    login_response = await client.post("/api/v1/auth/login", json=user_data)
    refresh_token = login_response.json()["refresh_token"]

    first_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert first_refresh.status_code == 200

    second_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert second_refresh.status_code == 401
    assert "revoked" in second_refresh.json()["detail"].lower()


@pytest.mark.asyncio
async def test_logout_time_invalidates_same_second_token(test_redis):
    """Tokens issued at logout timestamp should be considered invalid."""
    blacklist = TokenBlacklist(test_redis)
    user_id = "user-1"
    logout_time = 1_700_000_000

    await blacklist.add_user_logout(user_id, logout_time)
    is_valid = await blacklist.verify_token_not_blacklisted(
        token="access-token",
        user_id=user_id,
        token_iat=logout_time,
    )

    assert is_valid is False


@pytest.mark.asyncio
async def test_job_status_requires_job_ownership(
    client: AsyncClient,
    test_db: AsyncSession,
    monkeypatch,
):
    """Users should not access status for jobs they do not own."""
    user_a = {"email": "owner@example.com", "password": "SecurePass123!"}
    user_b = {"email": "other@example.com", "password": "SecurePass123!"}

    await client.post("/api/v1/auth/register", json=user_a)
    await client.post("/api/v1/auth/register", json=user_b)

    login_a = await client.post("/api/v1/auth/login", json=user_a)
    login_b = await client.post("/api/v1/auth/login", json=user_b)
    token_a = login_a.json()["access_token"]
    token_b = login_b.json()["access_token"]

    me_a = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    owner_id = me_a.json()["id"]

    history = SearchHistory(
        user_id=owner_id,
        search_params={"days_back": 30},
        job_status="pending",
        job_id="job-owned-by-a",
    )
    test_db.add(history)
    await test_db.commit()

    class DummyResult:
        state = "PENDING"
        info = None
        result = None

        def revoke(self, terminate=True):
            return None

    monkeypatch.setattr("app.api.v1.jobs.AsyncResult", lambda _: DummyResult())

    denied = await client.get(
        "/api/v1/jobs/job-owned-by-a/status",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert denied.status_code == 404

    allowed = await client.get(
        "/api/v1/jobs/job-owned-by-a/status",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert allowed.status_code == 200

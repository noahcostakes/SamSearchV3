"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


class TestAuthEndpoints:
    """Test authentication endpoints."""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient, user_data: dict):
        """Test successful user registration."""
        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert "id" in data
        assert data["is_active"] is True
        assert data["is_verified"] is False
        assert data["has_sam_api_key"] is False

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, user_data: dict):
        """Test registration with duplicate email fails."""
        # First registration
        await client.post("/api/v1/auth/register", json=user_data)

        # Second registration with same email
        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password fails."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "weak"},
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_register_password_no_uppercase(self, client: AsyncClient):
        """Test registration fails when password lacks uppercase letter."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "alllowercase1"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_no_digit(self, client: AsyncClient):
        """Test registration fails when password lacks a digit."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "NoDigitsHere"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_no_lowercase(self, client: AsyncClient):
        """Test registration fails when password lacks lowercase letter."""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "password": "ALLUPPER123"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, user_data: dict):
        """Test successful login returns tokens."""
        # Register first
        await client.post("/api/v1/auth/register", json=user_data)

        # Login
        response = await client.post("/api/v1/auth/login", json=user_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, user_data: dict):
        """Test login with wrong password fails."""
        # Register
        await client.post("/api/v1/auth/register", json=user_data)

        # Login with wrong password
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": user_data["email"], "password": "WrongPass123!"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user fails."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "Test123!"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user(self, client: AsyncClient, user_data: dict):
        """Test getting current user info with valid token."""
        # Register and login
        await client.post("/api/v1/auth/register", json=user_data)
        login_response = await client.post("/api/v1/auth/login", json=user_data)
        token = login_response.json()["access_token"]

        # Get current user
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token fails."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logout(self, client: AsyncClient, user_data: dict):
        """Test logout invalidates token."""
        # Register and login
        await client.post("/api/v1/auth/register", json=user_data)
        login_response = await client.post("/api/v1/auth/login", json=user_data)
        token = login_response.json()["access_token"]

        # Logout
        logout_response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout_response.status_code == 200

        # Try to use token after logout (should fail)
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token(self, client: AsyncClient, user_data: dict):
        """Test refreshing access token."""
        # Register and login
        await client.post("/api/v1/auth/register", json=user_data)
        login_response = await client.post("/api/v1/auth/login", json=user_data)
        refresh_token = login_response.json()["refresh_token"]

        # Refresh
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data


class TestAuthRateLimiting:
    """Test authentication rate limiting."""

    @pytest.mark.asyncio
    async def test_register_rate_limit(self, client: AsyncClient):
        """Test that registration is rate-limited after too many attempts."""
        # Make 6 registration attempts (limit is 5 per 15 min window)
        for i in range(6):
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": f"user{i}@example.com",
                    "password": "SecurePass123!",
                },
            )
            if i < 5:
                # First 5 should succeed (201) or fail for other reasons
                assert response.status_code in (201, 400, 422)
            else:
                # 6th should be rate-limited
                assert response.status_code == 429

    @pytest.mark.asyncio
    async def test_login_rate_limit(self, client: AsyncClient, user_data: dict):
        """Test that login is rate-limited after too many attempts."""
        # Register a user first
        await client.post("/api/v1/auth/register", json=user_data)

        # Make 11 login attempts (limit is 10 per 15 min window)
        for i in range(11):
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": user_data["email"], "password": "WrongPass123!"},
            )
            if i < 10:
                assert response.status_code in (200, 401)
            else:
                assert response.status_code == 429

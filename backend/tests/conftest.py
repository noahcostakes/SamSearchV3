"""Pytest configuration and fixtures."""
import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from redis.asyncio import Redis

from app.config import settings
from app.db.base import Base
from app.db.session import get_db, get_redis
from app.main import app

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_redis() -> AsyncGenerator[Redis, None]:
    """Create a mock Redis client for testing."""
    # Use fakeredis for testing
    try:
        import fakeredis.aioredis
        redis = fakeredis.aioredis.FakeRedis()
        yield redis
        await redis.close()
    except ImportError:
        # Fallback to real Redis if fakeredis not available
        redis = Redis.from_url("redis://localhost:6379/15", decode_responses=True)
        yield redis
        await redis.flushdb()
        await redis.close()


@pytest_asyncio.fixture(scope="function")
async def client(
    test_db: AsyncSession,
    test_redis: Redis,
) -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client with dependency overrides."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db

    async def override_get_redis() -> Redis:
        return test_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def user_data() -> dict:
    """Sample user data for registration."""
    return {
        "email": "test@example.com",
        "password": "SecurePass123!",
    }


@pytest.fixture
def profile_data() -> dict:
    """Sample profile data."""
    return {
        "company_name": "Test Company LLC",
        "employee_count": 50,
        "annual_revenue": 5000000,
        "headquarters_state": "VA",
        "primary_naics": "541511",
        "secondary_naics": ["541512", "541519"],
        "core_competencies": ["Software Development", "Cloud Computing"],
        "technical_skills": ["Python", "AWS", "Docker"],
        "industry_experience_years": 10,
        "certifications": ["8(a)", "SDVOSB"],
        "target_contract_min": 50000,
        "target_contract_max": 1000000,
        "preferred_agencies": ["DoD", "VA"],
        "service_area": ["VA", "MD", "DC"],
        "max_response_days": 14,
        "blacklist_keywords": ["construction", "janitorial"],
        "requires_clearance": False,
    }

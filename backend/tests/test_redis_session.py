"""Tests for Redis session hardening configuration."""
import pytest

import app.db.session as db_session
from app.config import settings


@pytest.mark.asyncio
async def test_get_redis_uses_hardened_connection_options(monkeypatch):
    captured: dict = {}
    calls = {"count": 0}

    class DummyRedisClient:
        async def aclose(self) -> None:
            return None

    dummy_client = DummyRedisClient()

    class DummyRedisFactory:
        @staticmethod
        def from_url(url, **kwargs):
            calls["count"] += 1
            captured["url"] = url
            captured["kwargs"] = kwargs
            return dummy_client

    monkeypatch.setattr(db_session, "Redis", DummyRedisFactory)
    monkeypatch.setattr(db_session, "_redis_client", None)

    first = await db_session.get_redis()
    second = await db_session.get_redis()

    assert first is dummy_client
    assert second is dummy_client
    assert calls["count"] == 1
    assert captured["url"] == settings.REDIS_URL
    assert captured["kwargs"]["decode_responses"] is True
    assert captured["kwargs"]["retry_on_timeout"] is True
    assert captured["kwargs"]["max_connections"] == settings.REDIS_MAX_CONNECTIONS
    assert (
        captured["kwargs"]["health_check_interval"]
        == settings.REDIS_HEALTH_CHECK_INTERVAL_SECONDS
    )
    assert captured["kwargs"]["socket_timeout"] == settings.REDIS_SOCKET_TIMEOUT_SECONDS
    assert (
        captured["kwargs"]["socket_connect_timeout"]
        == settings.REDIS_SOCKET_TIMEOUT_SECONDS
    )

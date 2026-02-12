"""Tests for environment variable compatibility in settings."""
from app.config import Settings


def _set_common_required_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/db")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")


def test_settings_accepts_canonical_names(monkeypatch):
    _set_common_required_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.setenv("JWT_SECRET_KEY", "x" * 32)
    monkeypatch.setenv("ENCRYPTION_MASTER_KEY", "0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173")

    settings = Settings(_env_file=None)

    assert settings.ENVIRONMENT == "staging"
    assert settings.JWT_SECRET_KEY == "x" * 32
    assert settings.ENCRYPTION_MASTER_KEY == "0123456789abcdef0123456789abcdef"
    assert settings.allowed_origins_list == ["http://localhost:5173"]


def test_settings_accepts_legacy_aliases(monkeypatch):
    _set_common_required_env(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "y" * 32)
    monkeypatch.setenv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")

    settings = Settings(_env_file=None)

    assert settings.ENVIRONMENT == "production"
    assert settings.JWT_SECRET_KEY == "y" * 32
    assert settings.ENCRYPTION_MASTER_KEY == "0123456789abcdef0123456789abcdef"
    assert settings.allowed_origins_list == [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

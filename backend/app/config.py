"""Application configuration using Pydantic Settings."""
import logging
from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict

_INSECURE_JWT_KEYS = {
    "dev-secret-key-change-in-production-min-32-chars",
    "changeme",
    "secret",
}


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "SAM.gov AI Search"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = Field(
        default="local",
        validation_alias=AliasChoices("ENVIRONMENT", "APP_ENV"),
    )  # local, staging, production

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # Redis
    REDIS_URL: str
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT_SECONDS: float = 5.0
    REDIS_HEALTH_CHECK_INTERVAL_SECONDS: int = 30

    # Security
    JWT_SECRET_KEY: str = Field(
        validation_alias=AliasChoices("JWT_SECRET_KEY", "SECRET_KEY")
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption for SAM.gov API keys
    ENCRYPTION_MASTER_KEY: str = Field(
        validation_alias=AliasChoices("ENCRYPTION_MASTER_KEY", "ENCRYPTION_KEY")
    )
    ENCRYPTION_ALLOW_LEGACY_FALLBACK: bool = True

    # AI - Local or Cloud
    USE_LOCAL_AI: bool = True  # Set to True for Ollama, False for Claude
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"  # or mistral, codellama, etc.
    
    # Claude (only needed if USE_LOCAL_AI=False)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    ANTHROPIC_MAX_TOKENS: int = 4000

    # SAM.gov
    SAM_API_KEY: str = ""  # Your SAM.gov API key
    SAM_API_BASE_URL: str = "https://api.sam.gov/opportunities/v2/search"
    SAM_RATE_LIMIT_PER_DAY: int = 950  # Buffer below 1000

    # CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        validation_alias=AliasChoices("ALLOWED_ORIGINS", "CORS_ORIGINS"),
    )  # Comma-separated
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # Monitoring
    PROMETHEUS_MULTIPROC_DIR: str = "/tmp/prometheus"
    SENTRY_DSN: str = ""

    # Rate Limiting (per user) - Set high for development/testing
    RATE_LIMIT_SEARCHES_PER_DAY: int = 100
    RATE_LIMIT_SEARCHES_PER_HOUR: int = 50

    # Quick search ranking/output controls
    QUICK_SEARCH_RESULT_LIMIT: int = Field(10, ge=1)
    AI_SCORING_CANDIDATE_LIMIT: int = Field(100, ge=1)

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated origins into list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parse comma-separated hosts into list."""
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _check_production_secrets(self) -> "Settings":
        """Refuse to start in production with insecure default secrets."""
        if self.is_production:
            if self.JWT_SECRET_KEY in _INSECURE_JWT_KEYS:
                raise ValueError(
                    "FATAL: JWT_SECRET_KEY is set to an insecure default. "
                    "Set a strong, unique secret before running in production."
                )
            if len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "FATAL: JWT_SECRET_KEY must be at least 32 characters in production."
                )
        elif self.JWT_SECRET_KEY in _INSECURE_JWT_KEYS:
            logging.getLogger(__name__).warning(
                "JWT_SECRET_KEY is using a development default. "
                "Do NOT use this value in production."
            )
        return self

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()

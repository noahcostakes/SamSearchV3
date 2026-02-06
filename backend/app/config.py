"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "SAM.gov AI Search"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "local"  # local, staging, production

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # Redis
    REDIS_URL: str

    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption for SAM.gov API keys
    ENCRYPTION_MASTER_KEY: str

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
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"  # Comma-separated
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

    class Config:
        # Look for .env in the parent directory (project root) or current dir
        env_file = ("../.env", ".env")
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

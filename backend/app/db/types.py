"""Shared SQLAlchemy types with cross-dialect compatibility."""
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# Use native JSONB on PostgreSQL and JSON elsewhere (e.g. SQLite test DB).
JSONType = JSON().with_variant(JSONB, "postgresql")


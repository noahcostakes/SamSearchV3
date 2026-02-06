"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2026-02-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("is_verified", sa.Boolean(), default=False),
        sa.Column("sam_api_key_encrypted", sa.String(500), nullable=True),
        sa.Column("sam_api_key_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("searches_this_month", sa.Integer(), default=0),
        sa.Column("last_search_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_created_at", "users", ["created_at"])

    # Create company_profiles table
    op.create_table(
        "company_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("employee_count", sa.Integer(), nullable=False),
        sa.Column("annual_revenue", sa.Integer(), nullable=True),
        sa.Column("headquarters_state", sa.String(2), nullable=False),
        sa.Column("primary_naics", sa.String(6), nullable=False),
        sa.Column("secondary_naics", postgresql.JSONB(), default=[]),
        sa.Column("core_competencies", postgresql.JSONB(), nullable=False),
        sa.Column("technical_skills", postgresql.JSONB(), default=[]),
        sa.Column("industry_experience_years", sa.Integer(), default=0),
        sa.Column("certifications", postgresql.JSONB(), default=[]),
        sa.Column("target_contract_min", sa.Integer(), default=25000),
        sa.Column("target_contract_max", sa.Integer(), default=2000000),
        sa.Column("preferred_agencies", postgresql.JSONB(), default=[]),
        sa.Column("service_area", postgresql.JSONB(), default=[]),
        sa.Column("max_response_days", sa.Integer(), default=30),
        sa.Column("blacklist_keywords", postgresql.JSONB(), default=[]),
        sa.Column("requires_clearance", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index("idx_profiles_user_id", "company_profiles", ["user_id"])
    op.create_index("idx_profiles_primary_naics", "company_profiles", ["primary_naics"])

    # Create search_history table
    op.create_table(
        "search_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("search_params", postgresql.JSONB(), nullable=False),
        sa.Column("total_results", sa.Integer(), default=0),
        sa.Column("high_relevance_count", sa.Integer(), default=0),
        sa.Column("medium_relevance_count", sa.Integer(), default=0),
        sa.Column("low_relevance_count", sa.Integer(), default=0),
        sa.Column("job_id", sa.String(100), nullable=True),
        sa.Column("job_status", sa.String(20), default="pending"),
        sa.Column("cached_results", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_search_history_user_id", "search_history", ["user_id"])
    op.create_index("idx_search_history_created_at", "search_history", ["created_at"])
    op.create_index("idx_search_history_job_id", "search_history", ["job_id"])

    # Create saved_opportunities table
    op.create_table(
        "saved_opportunities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notice_id", sa.String(100), nullable=False),
        sa.Column("solicitation_number", sa.String(100), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("agency", sa.String(200), nullable=True),
        sa.Column("posted_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("relevance_score", sa.Integer(), default=0),
        sa.Column("ai_analysis", postgresql.JSONB(), nullable=True),
        sa.Column("recommendation", sa.String(20), nullable=True),
        sa.Column("user_notes", sa.Text(), nullable=True),
        sa.Column("user_status", sa.String(20), default="saved"),
        sa.Column("opportunity_data", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index("idx_saved_opps_user_id", "saved_opportunities", ["user_id"])
    op.create_index("idx_saved_opps_notice_id", "saved_opportunities", ["notice_id"])
    op.create_index("idx_saved_opps_user_status", "saved_opportunities", ["user_id", "user_status"])

    # Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column("request_id", sa.String(36), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.String(100), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(20), default="success"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("idx_audit_logs_action", "audit_logs", ["action"])
    op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("idx_audit_logs_resource", "audit_logs", ["resource_type", "resource_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("saved_opportunities")
    op.drop_table("search_history")
    op.drop_table("company_profiles")
    op.drop_table("users")

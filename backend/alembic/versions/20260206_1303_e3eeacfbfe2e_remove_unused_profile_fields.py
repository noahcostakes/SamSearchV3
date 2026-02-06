"""remove unused profile fields

Revision ID: e3eeacfbfe2e
Revises: 361ffec74425
Create Date: 2026-02-06 13:03:54.108724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3eeacfbfe2e'
down_revision: Union[str, None] = '361ffec74425'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove unused columns from company_profiles
    op.drop_column('company_profiles', 'employee_count')
    op.drop_column('company_profiles', 'annual_revenue')
    op.drop_column('company_profiles', 'headquarters_state')
    op.drop_column('company_profiles', 'industry_experience_years')


def downgrade() -> None:
    # Re-add columns if rolling back
    op.add_column('company_profiles', sa.Column('industry_experience_years', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('company_profiles', sa.Column('headquarters_state', sa.String(length=2), nullable=False, server_default=''))
    op.add_column('company_profiles', sa.Column('annual_revenue', sa.Integer(), nullable=True))
    op.add_column('company_profiles', sa.Column('employee_count', sa.Integer(), nullable=False, server_default='1'))

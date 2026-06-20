"""add resolved_at to tickets

Revision ID: c1d2e3f4a5b6
Revises: ad3ca2056e24
Create Date: 2026-06-19 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'ad3ca2056e24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable resolved_at timestamp to tickets (used by Phase 21 avg-resolution metrics)."""
    op.add_column('tickets', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('tickets', 'resolved_at')

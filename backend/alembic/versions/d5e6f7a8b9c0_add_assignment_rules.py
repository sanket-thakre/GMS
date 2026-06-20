"""add assignment_rules

Revision ID: d5e6f7a8b9c0
Revises: c1d2e3f4a5b6
Create Date: 2026-06-20 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the assignment_rules table (Phase 14 routing engine)."""
    op.create_table(
        'assignment_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('hierarchy_id', sa.Integer(), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('priority_order', sa.Integer(), server_default='100', nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['grievance_categories.id'], ),
        sa.ForeignKeyConstraint(['hierarchy_id'], ['hierarchies.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assignment_rules_id'), 'assignment_rules', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_assignment_rules_id'), table_name='assignment_rules')
    op.drop_table('assignment_rules')

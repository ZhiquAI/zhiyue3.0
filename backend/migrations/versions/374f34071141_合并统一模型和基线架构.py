"""合并统一模型和基线架构

Revision ID: 374f34071141
Revises: 001_unified_models, 33c59e6e1b19
Create Date: 2025-08-22 23:34:02.823773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '374f34071141'
down_revision: Union[str, None] = ('001_unified_models', '33c59e6e1b19')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

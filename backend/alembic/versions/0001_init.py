"""init

Revision ID: 0001_init
Revises: 
Create Date: 2026-01-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("icon", sa.String(length=16), nullable=False, server_default="✨"),
        sa.Column("tier", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("rarity_weight", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_items_name", "items", ["name"], unique=True)

    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("left_item_id", sa.Integer(), nullable=False),
        sa.Column("right_item_id", sa.Integer(), nullable=False),
        sa.Column("result_item_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["left_item_id"], ["items.id"]),
        sa.ForeignKeyConstraint(["right_item_id"], ["items.id"]),
        sa.ForeignKeyConstraint(["result_item_id"], ["items.id"]),
        sa.UniqueConstraint("left_item_id", "right_item_id", name="uq_recipe_pair"),
    )
    op.create_index("ix_recipes_left_item_id", "recipes", ["left_item_id"])
    op.create_index("ix_recipes_right_item_id", "recipes", ["right_item_id"])
    op.create_index("ix_recipes_result_item_id", "recipes", ["result_item_id"])

    op.create_table(
        "user_inventory",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("wallet", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("times_crafted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"]),
        sa.UniqueConstraint("wallet", "item_id", name="uq_wallet_item"),
    )
    op.create_index("ix_user_inventory_wallet", "user_inventory", ["wallet"])
    op.create_index("ix_user_inventory_item_id", "user_inventory", ["item_id"])

    op.create_table(
        "craft_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("wallet", sa.String(length=64), nullable=False),
        sa.Column("left_item_id", sa.Integer(), nullable=False),
        sa.Column("right_item_id", sa.Integer(), nullable=False),
        sa.Column("result_item_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["left_item_id"], ["items.id"]),
        sa.ForeignKeyConstraint(["right_item_id"], ["items.id"]),
        sa.ForeignKeyConstraint(["result_item_id"], ["items.id"]),
    )
    op.create_index("ix_craft_logs_wallet", "craft_logs", ["wallet"])

def downgrade() -> None:
    op.drop_index("ix_craft_logs_wallet", table_name="craft_logs")
    op.drop_table("craft_logs")
    op.drop_index("ix_user_inventory_item_id", table_name="user_inventory")
    op.drop_index("ix_user_inventory_wallet", table_name="user_inventory")
    op.drop_table("user_inventory")
    op.drop_index("ix_recipes_result_item_id", table_name="recipes")
    op.drop_index("ix_recipes_right_item_id", table_name="recipes")
    op.drop_index("ix_recipes_left_item_id", table_name="recipes")
    op.drop_table("recipes")
    op.drop_index("ix_items_name", table_name="items")
    op.drop_table("items")

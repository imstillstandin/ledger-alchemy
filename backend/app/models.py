from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    icon: Mapped[str] = mapped_column(String(16), default="✨")
    tier: Mapped[int] = mapped_column(Integer, default=1)
    rarity_weight: Mapped[int] = mapped_column(Integer, default=100)  # lower = rarer
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Recipe(Base):
    __tablename__ = "recipes"
    __table_args__ = (
        UniqueConstraint("left_item_id", "right_item_id", name="uq_recipe_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    left_item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    right_item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    result_item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    left: Mapped["Item"] = relationship(foreign_keys=[left_item_id])
    right: Mapped["Item"] = relationship(foreign_keys=[right_item_id])
    result: Mapped["Item"] = relationship(foreign_keys=[result_item_id])

class UserInventory(Base):
    __tablename__ = "user_inventory"
    __table_args__ = (
        UniqueConstraint("wallet", "item_id", name="uq_wallet_item"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wallet: Mapped[str] = mapped_column(String(64), index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    times_crafted: Mapped[int] = mapped_column(Integer, default=0)
    discovered_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    item: Mapped["Item"] = relationship()

class CraftLog(Base):
    __tablename__ = "craft_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wallet: Mapped[str] = mapped_column(String(64), index=True)
    left_item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    right_item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    result_item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

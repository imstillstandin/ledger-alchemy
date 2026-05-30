from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.exc import IntegrityError
from .models import Item, Recipe, UserInventory, CraftLog
from .generator import generate_item

def canonical_pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a <= b else (b, a)

async def get_item(session: AsyncSession, item_id: int) -> Item:
    res = await session.execute(select(Item).where(Item.id == item_id))
    item = res.scalar_one_or_none()
    if not item:
        raise ValueError("Item not found")
    return item

async def craft(session: AsyncSession, wallet: str, left_id: int, right_id: int) -> tuple[Item, Item, Item, bool]:
    left_id, right_id = canonical_pair(left_id, right_id)
    left = await get_item(session, left_id)
    right = await get_item(session, right_id)

    res = await session.execute(
        select(Recipe).where(Recipe.left_item_id == left_id, Recipe.right_item_id == right_id)
    )
    recipe = res.scalar_one_or_none()

    if recipe:
        result = await get_item(session, recipe.result_item_id)
    else:
        spec = generate_item(left.name, right.name, left.id, right.id)

        result = Item(name=spec.name, icon=spec.icon, tier=spec.tier, rarity_weight=spec.rarity_weight)
        session.add(result)
        await session.flush()  # get result.id

        recipe = Recipe(left_item_id=left_id, right_item_id=right_id, result_item_id=result.id, version=1)
        session.add(recipe)
        try:
            await session.flush()
        except IntegrityError:
            # Race condition: recipe inserted by another request.
            await session.rollback()
            # Re-fetch recipe and result
            res = await session.execute(
                select(Recipe).where(Recipe.left_item_id == left_id, Recipe.right_item_id == right_id)
            )
            recipe = res.scalar_one()
            result = await get_item(session, recipe.result_item_id)

    # Inventory update
    inv_res = await session.execute(
        select(UserInventory).where(UserInventory.wallet == wallet, UserInventory.item_id == result.id)
    )
    inv = inv_res.scalar_one_or_none()
    is_new = False
    if inv is None:
        inv = UserInventory(wallet=wallet, item_id=result.id, times_crafted=1)
        session.add(inv)
        is_new = True
    else:
        inv.times_crafted += 1

    # Log craft
    session.add(CraftLog(wallet=wallet, left_item_id=left_id, right_item_id=right_id, result_item_id=result.id))
    await session.commit()
    return left, right, result, is_new

async def get_inventory(session: AsyncSession, wallet: str) -> tuple[int, list[UserInventory]]:
    res = await session.execute(select(UserInventory).where(UserInventory.wallet == wallet))
    rows = res.scalars().all()
    total = len(rows)
    return total, rows

async def leaderboard(session: AsyncSession, limit: int = 50) -> list[tuple[str, int, int]]:
    # discoveries = count distinct items in inventory
    # rare_score = sum(max(1, 200 - rarity_weight)) for discovered items
    inv = UserInventory
    item = Item

    res = await session.execute(
        select(
            inv.wallet.label("wallet"),
            func.count(inv.item_id).label("discoveries"),
            func.sum(func.greatest(1, 200 - item.rarity_weight)).label("rare_score"),
        )
        .join(item, item.id == inv.item_id)
        .group_by(inv.wallet)
        .order_by(func.count(inv.item_id).desc(), func.sum(func.greatest(1, 200 - item.rarity_weight)).desc())
        .limit(limit)
    )
    return [(r.wallet, int(r.discoveries), int(r.rare_score or 0)) for r in res.all()]

import asyncio
from sqlalchemy import select
from .db import engine, SessionLocal, Base
from .models import Item, Recipe

SEED_ITEMS = [
    ("Fire", "🔥", 1, 120),
    ("Water", "🌊", 1, 120),
    ("Earth", "🌿", 1, 120),
    ("Air", "💨", 1, 120),
    ("Time", "🕰️", 2, 90),
    ("Metal", "⚙️", 2, 90),
]

# canonical (min, max) pairs
SEED_RECIPES = [
    ("Fire", "Water", ("Steam", "🌫️", 2, 95)),
    ("Earth", "Water", ("Mud", "🟤", 2, 100)),
    ("Air", "Water", ("Mist", "🌁", 2, 100)),
    ("Fire", "Earth", ("Lava", "🌋", 3, 70)),
    ("Air", "Fire", ("Smoke", "🚬", 2, 100)),
    ("Metal", "Fire", ("Forge", "🧰", 3, 75)),
    ("Time", "Metal", ("Clockwork", "⏱️", 4, 55)),
    ("Time", "Earth", ("Fossil", "🦴", 3, 70)),
]

def canonical(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a <= b else (b, a)

async def run():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Create items if missing
        existing = (await session.execute(select(Item))).scalars().all()
        by_name = {i.name: i for i in existing}

        for name, icon, tier, weight in SEED_ITEMS:
            if name not in by_name:
                session.add(Item(name=name, icon=icon, tier=tier, rarity_weight=weight))
        await session.commit()

        existing = (await session.execute(select(Item))).scalars().all()
        by_name = {i.name: i for i in existing}

        # Seed result items and recipes
        for a, b, (rname, ricon, rtier, rweight) in SEED_RECIPES:
            if rname not in by_name:
                session.add(Item(name=rname, icon=ricon, tier=rtier, rarity_weight=rweight))
        await session.commit()

        existing = (await session.execute(select(Item))).scalars().all()
        by_name = {i.name: i for i in existing}

        # recipes
        for a, b, (rname, _, _, _) in SEED_RECIPES:
            left_id, right_id = canonical(by_name[a].id, by_name[b].id)
            result_id = by_name[rname].id
            # check exists
            res = await session.execute(select(Recipe).where(Recipe.left_item_id==left_id, Recipe.right_item_id==right_id))
            if res.scalar_one_or_none() is None:
                session.add(Recipe(left_item_id=left_id, right_item_id=right_id, result_item_id=result_id, version=1))
        await session.commit()

if __name__ == "__main__":
    asyncio.run(run())

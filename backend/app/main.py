from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .config import settings
from .deps import get_db, get_wallet_from_auth
from . import schemas
from .models import Item
from .crud import craft as craft_fn, get_inventory as inv_fn, leaderboard as lb_fn
from .auth import create_login_challenge, verify_login, create_jwt

app = FastAPI(title="Ledger Alchemy (MVP)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.get("/items", response_model=list[schemas.ItemOut])
async def list_items(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Item).order_by(Item.id.asc()).limit(500))
    return [schemas.ItemOut.model_validate(i, from_attributes=True) for i in res.scalars().all()]

@app.post("/auth/challenge", response_model=schemas.LoginChallengeResponse)
async def auth_challenge(payload: dict):
    wallet = (payload.get("wallet") or "").strip()
    try:
        nonce, msg = create_login_challenge(wallet)
        return schemas.LoginChallengeResponse(wallet=wallet, nonce=nonce, message=msg)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=schemas.LoginResponse)
async def auth_login(req: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    # message must be reconstructed the same way client signed it.
    # Client should submit the `message` from /auth/challenge (or recompute identically).
    # For MVP, we accept signature as optional but enforce nonce.
    message = f"Sign in to Ledger Alchemy. Wallet: {req.wallet}. Nonce: {req.nonce}."
    try:
        verify_login(req.wallet, req.nonce, req.signature, message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    token = create_jwt(req.wallet)
    return schemas.LoginResponse(token=token)

@app.post("/craft", response_model=schemas.CraftResponse)
async def craft(req: schemas.CraftRequest, wallet: str = Depends(get_wallet_from_auth), db: AsyncSession = Depends(get_db)):
    try:
        left, right, result, is_new = await craft_fn(db, wallet, req.left_item_id, req.right_item_id)
        return schemas.CraftResponse(
            left=schemas.ItemOut.model_validate(left, from_attributes=True),
            right=schemas.ItemOut.model_validate(right, from_attributes=True),
            result=schemas.ItemOut.model_validate(result, from_attributes=True),
            is_new_discovery=is_new,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/me/inventory", response_model=schemas.InventoryOut)
async def my_inventory(wallet: str = Depends(get_wallet_from_auth), db: AsyncSession = Depends(get_db)):
    total, rows = await inv_fn(db, wallet)
    items = []
    for r in rows:
        items.append(schemas.InventoryEntryOut(
            item=schemas.ItemOut.model_validate(r.item, from_attributes=True),
            times_crafted=r.times_crafted,
        ))
    items.sort(key=lambda x: (x.item.tier, x.item.name))
    return schemas.InventoryOut(wallet=wallet, total_discoveries=total, items=items)

@app.get("/leaderboard", response_model=schemas.LeaderboardOut)
async def leaderboard(db: AsyncSession = Depends(get_db)):
    rows = await lb_fn(db, limit=50)
    return schemas.LeaderboardOut(
        rows=[schemas.LeaderboardRow(wallet=w, discoveries=d, rare_score=rs) for (w, d, rs) in rows]
    )

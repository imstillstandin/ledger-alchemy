from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .db import SessionLocal
from .auth import decode_jwt

async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session

def get_wallet_from_auth(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        return decode_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

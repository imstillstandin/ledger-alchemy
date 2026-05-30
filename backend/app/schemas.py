from pydantic import BaseModel, Field
from typing import List, Optional

class ItemOut(BaseModel):
    id: int
    name: str
    icon: str
    tier: int
    rarity_weight: int

class CraftRequest(BaseModel):
    left_item_id: int
    right_item_id: int

class CraftResponse(BaseModel):
    left: ItemOut
    right: ItemOut
    result: ItemOut
    is_new_discovery: bool

class LoginChallengeResponse(BaseModel):
    wallet: str
    nonce: str
    message: str

class LoginRequest(BaseModel):
    wallet: str
    signature: Optional[str] = Field(default=None, description="Wallet-signed message. TODO: enforce verification.")
    nonce: str

class LoginResponse(BaseModel):
    token: str

class InventoryEntryOut(BaseModel):
    item: ItemOut
    times_crafted: int

class InventoryOut(BaseModel):
    wallet: str
    total_discoveries: int
    items: List[InventoryEntryOut]

class LeaderboardRow(BaseModel):
    wallet: str
    discoveries: int
    rare_score: int

class LeaderboardOut(BaseModel):
    rows: List[LeaderboardRow]

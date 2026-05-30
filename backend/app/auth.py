import re
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt
from .config import settings

XRPL_CLASSIC_ADDRESS_RE = re.compile(r"^r[1-9A-HJ-NP-Za-km-z]{25,34}$")

# In-memory nonce store for MVP.
# For production, use Redis or DB table with TTL.
_NONCES: dict[str, tuple[str, datetime]] = {}

def create_login_challenge(wallet: str) -> tuple[str, str]:
    if not XRPL_CLASSIC_ADDRESS_RE.match(wallet):
        raise ValueError("Invalid XRPL classic address format")

    nonce = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc).isoformat()
    msg = f"Sign in to Ledger Alchemy. Wallet: {wallet}. Nonce: {nonce}. Time: {now}"
    _NONCES[wallet] = (nonce, datetime.now(timezone.utc) + timedelta(minutes=10))
    return nonce, msg

def verify_login(wallet: str, nonce: str, signature: str | None, message: str) -> None:
    # MVP: enforce nonce match + address format.
    if not XRPL_CLASSIC_ADDRESS_RE.match(wallet):
        raise ValueError("Invalid XRPL classic address format")

    stored = _NONCES.get(wallet)
    if not stored:
        raise ValueError("No active challenge. Request a new challenge.")
    expected_nonce, expires = stored
    if datetime.now(timezone.utc) > expires:
        _NONCES.pop(wallet, None)
        raise ValueError("Challenge expired. Request a new challenge.")
    if nonce != expected_nonce:
        raise ValueError("Nonce mismatch. Request a new challenge.")

    # TODO (Phase 2): Verify signature properly against XRPL address.
    # Recommended options:
    # 1) Use a verified XRPL wallet auth flow (Xumm payload sign-in), or
    # 2) Use a cryptographic library that supports XRPL address verification.
    #
    # For MVP demos, we allow signature to be optional.
    return

def create_jwt(wallet: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": wallet,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=7)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def decode_jwt(token: str) -> str:
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    return payload["sub"]

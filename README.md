# Ledger Alchemy (MVP Skeleton)

An Infinite-Craft-style crafting game that is **XRPL-native** (wallet identity), with **off-chain** crafting/inventory for speed.

This repo includes:
- **Backend**: FastAPI + Postgres (recipes, items, inventory, leaderboard)
- **Frontend**: Next.js (craft UI, inventory, leaderboard, login)
- **Dev stack**: Docker Compose (optional), or run locally with Node + Python

> Note: Wallet signature verification is wired as an interface, but the cryptographic verification is a TODO (see backend `auth.py`).
> For MVP demos you can use "dev login" (address-only) and harden signature verification in Phase 2.

---

## Quickstart (Docker)

1) Install Docker + Docker Compose
2) From repo root:

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

---

## Quickstart (Local without Docker)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## MVP Features
- Craft: `A + B -> C` (symmetric)
- Inventory: discovered items per wallet
- Leaderboard: by discoveries + rare score
- Seed items + seed recipes
- Deterministic crafting:
  - If recipe exists, use it
  - If not, server generates result via safe fallback generator, inserts recipe, returns it

---

## Next Steps (Phase 2)
- Replace dev login with real XRPL wallet signature verification
- Rate-limits + anti-spam
- Admin recipe import (CSV)
- Minting milestones on XRPL (rare crafts, seasons, achievements)

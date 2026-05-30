# Ledger Alchemy - Codex Agent Instructions

## Product Direction
Ledger Alchemy is an XRPL-inspired crafting and discovery game, loosely inspired by Infinite Craft.

The current repo began as "Infinite Craft XRPL", but the target product name is "Ledger Alchemy".

The core idea:
- Users start with basic elements.
- Users combine two items.
- A recipe produces a result item.
- Newly discovered items are added to the user's inventory.
- Discovery, rarity, progression, and experimentation are the main game loop.
- XRPL/NFT integration should come later, after the off-chain game loop feels fun.

## Current Architecture
This repo uses:
- Backend: FastAPI, SQLAlchemy, Alembic, Postgres
- Frontend: Next.js 14, React 18
- Auth: temporary/mock wallet login
- Data: seed items and seed recipes
- Dev stack: Docker Compose optional

## Phase 1 Priority
Phase 1 is a playable off-chain prototype.

Do:
- Improve the game loop.
- Improve UI and UX.
- Make inventory and crafting feel satisfying.
- Keep recipes easy to expand.
- Keep code simple and readable.
- Rebrand user-facing text from Infinite Craft XRPL to Ledger Alchemy.
- Preserve the existing backend/frontend architecture unless explicitly told otherwise.

Do not:
- Add real XRPL transactions.
- Add real NFT minting.
- Add burn mechanics.
- Add private key handling.
- Add paid features.
- Over-engineer the architecture.
- Rewrite the whole repo unless explicitly requested.

## Product Rules
- Combining two items should be symmetric unless a task explicitly says otherwise.
- Results should feel thematically coherent.
- Every item should have a name, icon, tier, and rarity.
- Rarity should support future progression and leaderboard scoring.
- Unknown combinations may generate fallback results, but seeded recipes should feel more intentional and premium.
- Wallet login is currently a placeholder and should be treated as mock/dev only.

## UX Direction
Design should feel:
- premium
- mysterious
- alchemical
- dark mode
- mobile-friendly
- game-like, not corporate
- clean and simple

Avoid:
- spreadsheet-like layouts
- bland SaaS visuals
- cluttered controls
- crypto jargon too early in the UX

## Development Rules
Before making changes:
- Inspect the relevant files.
- Explain the intended change briefly.
- Prefer small, safe edits.
- Avoid unrelated refactors.
- Keep backend and frontend contracts aligned.
- Update README when setup or behaviour changes.

Testing expectations:
- Run available tests if they exist.
- If no tests exist, add practical tests where useful.
- At minimum, run build/type checks where available.
- If a command cannot run due to environment constraints, say so clearly.

## Security Rules
Never:
- Store private keys.
- Ask users to paste seed phrases.
- Add signing or transaction submission without explicit instruction.
- Hardcode production secrets.
- Use real payments or minting in Phase 1.

## Naming
User-facing product name: Ledger Alchemy

Legacy internal names may remain temporarily if changing them would cause unnecessary churn, but new user-facing copy should use Ledger Alchemy.

## Monitization
Monetization should emerge from discovery, rarity, ownership, prestige, and collection psychology.

Avoid pay-to-win mechanics.

The game must feel fun and addictive before blockchain monetization is added.

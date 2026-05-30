# Backend Agent Instructions - Ledger Alchemy

## Backend Scope
The backend is a FastAPI service for:
- item listing
- crafting
- inventory
- leaderboard
- mock wallet authentication
- recipe and item persistence

## Stack
- FastAPI
- SQLAlchemy async
- Alembic
- Postgres
- Pydantic

## Backend Priorities
Prioritise:
- deterministic crafting behaviour
- clear API contracts
- simple database models
- safe migrations
- seed data quality
- easy future XRPL integration

## Current Phase
Phase 1 is off-chain only.

Do not add:
- real XRPL signing
- real minting
- private key storage
- payment handling
- burn transactions

## API Rules
- Keep response models explicit.
- Keep frontend expectations stable.
- If changing an endpoint response, update frontend API usage in the same task.
- Keep errors clear and user-safe.

## Crafting Rules
- Recipes should be symmetric unless explicitly changed.
- When checking combinations, normalise item pair order if that is the project convention.
- Seeded recipes should take priority over generated fallback recipes.
- Fallback generation should be safe, deterministic enough for MVP demos, and not produce offensive or low-quality names.

## Database Rules
- Use Alembic for schema changes.
- Do not manually edit production-like database state.
- Keep model and migration changes aligned.
- Preserve existing data where possible.

## Testing
Add backend tests for:
- health endpoint
- item listing
- auth challenge/login flow where practical
- crafting known recipes
- crafting unknown/fallback recipes
- inventory updates
- leaderboard scoring

If pytest is not currently configured, propose the setup before adding large test suites.

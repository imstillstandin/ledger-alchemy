# Frontend Agent Instructions - Ledger Alchemy

## Frontend Scope
The frontend is a Next.js app for:
- login
- crafting interface
- inventory
- leaderboard
- item discovery

## Stack
- Next.js 14
- React 18
- TypeScript

## UX Goal
Make Ledger Alchemy feel like a premium alchemy/discovery game.

The experience should feel:
- mysterious
- playful
- polished
- mobile-friendly
- fast
- easy to understand

## UI Priorities
Prioritise:
- clear crafting flow
- satisfying reveal of new results
- readable inventory
- rarity labels
- responsive layout
- strong empty states
- simple onboarding copy

Avoid:
- clutter
- bland SaaS dashboards
- excessive crypto language
- wallet complexity in Phase 1

## Phase 1 Rules
Do not add real wallet integrations unless explicitly requested.
The current wallet/login flow is mock/dev only.

## Frontend Development Rules
- Keep components simple.
- Keep API calls centralised in app/lib/api.ts where possible.
- Keep wallet logic isolated in app/lib/wallet.ts.
- Do not introduce large UI libraries unless explicitly requested.
- Avoid unnecessary dependencies.
- Use clean CSS or simple component styling.

## Suggested Screens
Core screens:
- Craft
- Inventory
- Leaderboard
- Login/dev wallet entry

Future screens:
- Recipe book
- Discovery journal
- Item detail page
- Season/milestone page
- NFT mint eligibility page

## Testing / Checks
When practical:
- Run npm install if dependencies are missing.
- Run npm run build after meaningful changes.
- Fix TypeScript errors before finishing.

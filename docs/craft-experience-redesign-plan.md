# Craft Experience Redesign Plan

## 1. Target Visual Identity

Ledger Alchemy should feel like a premium digital alchemy archive: ancient, precise, collectible, and quietly technological. The visual language should combine ritual craft with ledger permanence.

Core identity:
- Dark archive environment, not a dashboard.
- Warm metallic accents: gold, brass, tarnished silver.
- Deep ink backgrounds with subtle ledger-line structure.
- Alchemical geometry used as framing, not decoration spam.
- Item results treated as artifacts with provenance, rarity, and permanence.
- XRPL influence expressed through ledger grids, inscription marks, sequence lines, and immutable record language rather than overt crypto branding.

Avoid:
- Generic glassmorphism cards.
- Neon cyberpunk or casino-like glow.
- Dense SaaS panel layouts.
- Random decorative glyph clutter.
- UI that makes the revealed item feel like a temporary result instead of a collectible object.

## 2. Fusion Interaction Feel

The fusion interaction should feel like placing two artifacts into ritual anchors, then committing the combination into a ledger.

Desired feel:
- The two selected items sit in prominent seal slots.
- The center of the screen acts as the ritual focus, not just a button area.
- The action should imply convergence: two anchors, one inscription.
- The player should understand that choosing items is fast, but fusing them is meaningful.

Interaction model:
- Item cards remain fast to click.
- Clicking an item fills the active seal slot.
- Active slot state should be visually obvious.
- The Fuse action should become available only when both seals are filled.
- On fuse, the chamber should briefly enter an inscription state before the reveal appears.

Animation direction:
- Short, deliberate, 1 to 1.5 seconds.
- Energy line convergence toward the center.
- Subtle seal pulse on both selected items.
- No particle explosion or excessive motion.

## 3. Reveal Artifact Design

The reveal must take center stage. It should feel like the actual artifact emerging from the archive, not a small status card.

Reveal composition:
- Large artifact preview area centered or visually dominant.
- Big item icon or generated artifact mark.
- Item name with strong hierarchy.
- Rarity badge with consistent visual treatment.
- Tier and discovery state presented as provenance metadata.
- Copy such as “Inscribed into the Archive” or “Recorded in the Ledger.”

Artifact frame:
- Use a distinct artifact card/frame shape, separate from normal UI cards.
- Include subtle border geometry, inner linework, rarity glow, and archive/ledger marks.
- The frame should feel like a collectible object users may later mint.

Reveal states:
- New discovery: ceremonial, stronger glow, archive inscription language.
- Known formula: quieter, “Already recorded” language.
- Demo mode: clearly indicate mock/demo record while preserving the reveal aesthetics.

## 4. Future NFT Preview Principle

The revealed item should become the exact visual foundation for the future NFT.

That means:
- The reveal artifact should be designed as a reusable “Artifact Preview” surface.
- The same layout should later be exportable or reproducible for minting metadata/media.
- The artifact should include stable fields:
  - item name
  - icon or artifact symbol
  - rarity
  - tier
  - discovery/mintable status
  - optional recipe provenance later

Future NFT direction:
- The current reveal should be treated as the canonical pre-mint artifact card.
- Later NFT minting should not invent a separate visual language.
- Mintable items can reuse this artifact frame with additional ledger/NFT metadata.

Practical implication:
- Build the reveal as a clear component-like section even if it remains in `app/page.tsx` initially.
- Keep its styling coherent and reusable.
- Avoid relying on transient UI-only details that would not make sense on an NFT preview.

## 5. What Should Change In `app/page.tsx`

Keep changes focused on the craft screen.

Recommended changes:
- Refactor the reveal section into a visually dominant artifact preview block.
- Make the result reveal appear above or visually separate from the lower item grid once available.
- Strengthen selected item seal styling so the selected inputs feel like ritual anchors.
- Make the central fusion conduit clearer and more directional.
- Improve item card styling so they feel like collectible fragments, not buttons in a dashboard.
- Add deterministic CSS-only atmospheric background layers.
- Keep demo mode support and existing craft state.
- Keep rarity helper usage.

Likely local structure:
- Keep helper functions near the top of `page.tsx`.
- Optionally introduce small render helpers inside the same file:
  - `ArtifactReveal`
  - `FusionSlot`
  - `ItemCard`
- Avoid extracting files unless the page becomes difficult to maintain.

## 6. What Should Not Change

Do not change:
- Backend APIs.
- Craft request/response contracts.
- Auth flow.
- Demo mode behavior beyond supporting the visual reveal.
- Inventory, login, or leaderboard pages.
- Recipe logic.
- Rarity label thresholds unless separately requested.
- Product scope around real XRPL/NFT minting.

Avoid adding:
- New animation libraries.
- Randomized client-only particles that can cause hydration issues.
- Heavy canvas/WebGL effects.
- New dependencies.
- Real minting, signing, or wallet integration.

## 7. Safe Implementation Sequence

1. Stabilize the craft page render path.
   - Keep the existing mounted guard.
   - Confirm no browser-only reads during first render.
   - Keep demo mode working.

2. Redesign the reveal first.
   - Make the artifact reveal the center of the experience.
   - Add artifact-frame styling, stronger hierarchy, rarity treatment, and archive language.
   - Verify both demo and API result shapes work.

3. Improve fusion slots.
   - Make selected slots look like ritual seals.
   - Clarify active slot state.
   - Keep the same selection logic.

4. Improve the central fusion conduit and button.
   - Make the center visually meaningful.
   - Keep the existing 1.2 second fusing delay.
   - Avoid additional state unless necessary.

5. Improve item cards.
   - Add artifact-like styling and rarity accents.
   - Keep cards readable and quick to click.
   - Preserve current item selection behavior.

6. Add atmospheric background polish.
   - Use deterministic CSS only.
   - Keep it behind content and non-interactive.
   - Confirm mobile readability.

7. Verify.
   - Run `npm.cmd run build`.
   - Manually check normal mode, backend failure/demo entry, demo craft reveal, and mobile layout.

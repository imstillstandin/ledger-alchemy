# Premium Discovery Reveal Vertical Slice Plan

## Summary

Create one emotionally compelling Ledger Alchemy fusion-and-reveal vertical slice. The objective is not feature completeness. The objective is emotional impact, collectible feeling, and a reveal moment that makes the result feel worthy of inscription into the Ledger.

The experience should feel like a restrained archive ritual: two selected artifacts converge, the result is inscribed, and the revealed object appears as a premium collectible preview that could later become a mintable artifact.

## Experience Goals

- **Fusion anticipation:** Build tension before the result appears.
- **Reveal sequence:** Make the result feel ceremonially inscribed, not merely displayed.
- **Artifact presentation:** Treat the result as the visual center of the craft experience.
- **Provenance display:** Show enough archive context to create ownership and historical meaning.
- **Immediate ownership feeling:** Make the player feel this artifact now belongs to their archive.
- **Repeat-discovery temptation:** Encourage another fusion through curiosity, not loot-box pressure.

## Emotional Pacing

The reveal should follow a clear emotional rhythm:

1. **Selection confidence:** The two chosen items feel like deliberate ritual anchors.
2. **Commitment:** Pressing the fusion action feels like beginning an inscription process.
3. **Anticipation:** The interface pauses for 1.2 to 1.5 seconds while the seals converge.
4. **Inscription:** The center of the chamber signals that the archive is recording the result.
5. **Reveal:** The artifact appears as a collectible object, not a UI response.
6. **Ownership:** The player sees provenance language confirming the artifact has entered the archive.
7. **Return loop:** The interface invites continued exploration without pressure or gimmicks.

## Key Experience Changes

### Fusion Anticipation

Keep the existing two-slot ritual structure, but make the transition clearer:

- selected slots should feel acknowledged when fusion begins
- the conduit should visually converge toward the center
- the center fusion area should pulse once as an inscription point
- the result should remain hidden until the anticipation sequence completes

The anticipation should feel ceremonial, mechanical, and premium. It should not feel like a slot machine, reward spinner, or game loot reveal.

### Reveal Sequence

The result should appear only after the fusion sequence completes.

The reveal should feel like an artifact emerging into the archive:

- subtle upward emergence or materialization
- restrained engraving or light sweep
- brief settling motion
- no confetti
- no flashing
- no bounce animation
- no excessive particles

The reveal should draw attention to the artifact first, then provenance second.

### Artifact Presentation

The artifact should be the primary object in the reveal section.

The reveal should include:

- large centered artifact frame
- minted-metal or premium foil material cues
- central medallion or object area
- strong silhouette
- item name as the primary title
- restrained rarity/provenance treatment
- archive footer language

The revealed object should feel like a future NFT preview, not a temporary result card.

### Provenance Display

Provenance should create prestige without becoming a dashboard.

Use concise archive language such as:

- New Discovery
- Archive Inscription
- Known Formula
- Recorded in the Ledger
- Inscribed into the Archive
- Provenance
- Rarity
- Tier
- Archive Number

New discoveries should feel historically more important than known formulas, but known formulas should still feel meaningful.

### Immediate Ownership Feeling

After reveal, the user should feel that the artifact has entered their collection or archive.

The copy and composition should imply:

- this object has been recorded
- this result has provenance
- this item can be collected, remembered, and later minted
- the player has participated in archive history

The interface should avoid language that sounds transactional, generic, or speculative.

### Repeat-Discovery Temptation

After the reveal settles, the experience should gently invite another attempt.

Preferred direction:

- a restrained `Continue the Ritual` action
- return focus to the fusion slots
- keep the previous artifact visible until the player begins another attempt

Avoid:

- loot-box language
- urgency timers
- scarcity pressure
- casino-like repeat prompts
- excessive reward framing

## Implementation Direction

Keep implementation focused on the craft screen reveal path.

Primary implementation area:

- `frontend/app/page.tsx`

Preserve:

- existing craft API calls
- demo mode
- current item selection behavior
- rarity helper behavior
- backend contracts
- inventory, login, leaderboard, and unrelated pages

Introduce a small local reveal sequence model:

- `idle`
- `fusing`
- `inscribing`
- `revealed`

Use this sequence to separate the emotional pacing from the API request itself. The craft request can still run in parallel with the timed animation, but the result should only render once the reveal sequence reaches the appropriate state.

Use deterministic CSS and React timing only:

- no new animation libraries
- no random values during render
- no browser-only reads during initial render
- no generated display text that can create hydration mismatch

## Artifact Reveal Structure

The reveal should remain a local component or helper in the craft screen.

Recommended structure:

- outer reveal shell
- discovery state header
- central artifact frame
- medallion/object area
- item name
- provenance metadata
- archive footer line
- optional repeat action after reveal settles

Recommended hierarchy:

1. artifact object
2. item name
3. discovery state
4. provenance metadata
5. archive footer
6. repeat action

The artifact object should visually dominate. Metadata should support the object, not compete with it.

## Rarity Treatment

Rarity should be visible through materiality and composition, not loud color.

Suggested treatment:

- **Common:** dark metal, simple frame, low inscription density.
- **Uncommon:** aged bronze, warmer rim, slightly richer frame.
- **Rare:** silver or enamel treatment, clearer polish, stronger contrast.
- **Epic:** dark gold, deeper frame, more ceremonial presence.
- **Mythic:** ceremonial alloy, refined motion, strongest material depth.

Rarity can affect:

- frame depth
- border richness
- metal finish
- inscription density
- shadow depth
- subtle reveal motion

Rarity should not become:

- rainbow color coding
- loud badges
- neon glow
- exaggerated game tiers
- slot-machine visuals

## Motion Philosophy

Motion should feel expensive because it is restrained.

Preferred motion:

- slow convergence
- seal acknowledgement
- single inscription pulse
- subtle medallion emergence
- faint engraved light sweep
- provenance appearing after the artifact

Avoid:

- bouncing
- flashing
- confetti
- rapid sparkles
- constant pulsing
- neon trails
- heavy particle effects
- loot-box timing patterns

## Mobile Requirements

The vertical slice must remain strong on mobile.

Mobile behavior:

- fusion slots stack cleanly
- conduit remains understandable vertically
- reveal artifact remains centered
- item name wraps cleanly
- provenance rows stack if needed
- action button remains reachable
- no text overlaps the artifact frame

The mobile reveal should still feel premium, not compressed into a utility card.

## Acceptance Criteria

- A user can select two artifacts, start fusion, feel a clear anticipation phase, and receive a reveal that feels materially different from normal UI.
- The revealed item feels closer to a future NFT artifact preview than a game result card.
- New discoveries feel more historically significant than known formulas without making known formulas feel worthless.
- Rarity is visible through composition, materiality, framing, and restrained motion.
- Demo mode still works and can trigger the same reveal experience without backend access.
- Existing API-based flow still works unchanged.
- No backend files, APIs, schemas, or craft logic are changed.
- No unrelated pages are redesigned.

## Test Plan

Run:

```powershell
npm.cmd run build
```

Manual verification:

- demo mode still appears when login/API fetch fails
- demo mode loads mock items
- selecting two items enables the fusion action
- fusion sequence lasts long enough to create anticipation
- reveal appears only after the anticipation sequence
- revealed artifact is visually dominant
- provenance remains readable
- repeat action does not feel like loot-box pressure
- API mode still uses the existing craft request shape
- mobile layout remains readable and centered

Hydration verification:

- no `Math.random()` during render
- no `Date.now()` during render
- no `localStorage` reads outside mounted effects
- no browser-only APIs used during initial render
- no generated display text that differs between server render and first client render

## Assumptions

- This vertical slice improves only the craft and reveal path.
- The reveal uses currently available result fields only.
- Provenance is display-only for this slice.
- No backend schema or API changes are required.
- No new animation or rendering libraries are required.
- Premium means restrained materiality, archive ritual pacing, and collectible hierarchy, not louder effects.

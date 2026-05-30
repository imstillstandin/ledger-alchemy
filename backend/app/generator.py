import hashlib
from dataclasses import dataclass

@dataclass(frozen=True)
class GeneratedItemSpec:
    name: str
    icon: str
    tier: int
    rarity_weight: int

ICONS = ["✨", "🧪", "⚙️", "🪐", "🔥", "🌊", "🌿", "🗿", "🧠", "🧿", "🧬", "🕰️"]
PREFIX = ["Ancient", "Neon", "Quantum", "Forbidden", "Celestial", "Rusty", "Mythic", "Glitched", "Crystal", "Oyster"]
SUFFIX = ["Core", "Shard", "Engine", "Glyph", "Sigil", "Bloom", "Forge", "Echo", "Relic", "Circuit"]

def _stable_int(*parts: str) -> int:
    h = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(h[:12], 16)

def generate_item(left_name: str, right_name: str, left_id: int, right_id: int) -> GeneratedItemSpec:
    # Deterministic generator: same inputs => same output.
    s = _stable_int(left_name, right_name, str(left_id), str(right_id))
    icon = ICONS[s % len(ICONS)]
    pref = PREFIX[(s // 7) % len(PREFIX)]
    suf = SUFFIX[(s // 49) % len(SUFFIX)]

    # Tier rises slowly with ID magnitude.
    tier = 1 + ((left_id + right_id + (s % 13)) // 6)
    tier = max(1, min(tier, 10))

    # Rarity weight lower is rarer; make higher tiers rarer.
    rarity_weight = max(5, 140 - tier * 12 - (s % 25))

    # Name pattern to feel alchemical and discovery-driven.
    base = left_name if (s % 2 == 0) else right_name
    name = f"{pref} {base} {suf}"
    return GeneratedItemSpec(name=name[:80], icon=icon, tier=tier, rarity_weight=rarity_weight)

export type RarityLabel = "Common" | "Uncommon" | "Rare" | "Epic" | "Mythic";

export function rarityLabel(weight: number): RarityLabel {
  if (weight <= 25) return "Mythic";
  if (weight <= 55) return "Epic";
  if (weight <= 85) return "Rare";
  if (weight <= 110) return "Uncommon";
  return "Common";
}

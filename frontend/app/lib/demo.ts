export type DemoItem = { id: number; name: string; icon: string; tier: number; rarity_weight: number };

export const DEMO_MODE_KEY = "ledger_alchemy_demo";

export const demoItems: DemoItem[] = [
  { id: 1, name: "Fire", icon: "\u{1F525}", tier: 1, rarity_weight: 120 },
  { id: 2, name: "Water", icon: "\u{1F30A}", tier: 1, rarity_weight: 120 },
  { id: 3, name: "Earth", icon: "\u{1F33F}", tier: 1, rarity_weight: 120 },
  { id: 4, name: "Air", icon: "\u{1F4A8}", tier: 1, rarity_weight: 120 },
  { id: 5, name: "Moon Salt", icon: "\u{1F319}", tier: 3, rarity_weight: 70 },
  { id: 6, name: "Aether Glass", icon: "\u{1F52E}", tier: 4, rarity_weight: 45 },
];

export function isDemoMode() {
  return typeof window !== "undefined" && localStorage.getItem(DEMO_MODE_KEY) === "1";
}

export function setDemoMode(enabled: boolean) {
  if (typeof window === "undefined") return;

  if (enabled) {
    localStorage.setItem(DEMO_MODE_KEY, "1");
  } else {
    localStorage.removeItem(DEMO_MODE_KEY);
  }
}

export function demoCraft(leftId: number, rightId: number) {
  const left = demoItems.find((item) => item.id === leftId) || demoItems[0];
  const right = demoItems.find((item) => item.id === rightId) || demoItems[1];
  const result: DemoItem = {
    id: 100 + left.id + right.id,
    name: `${left.name} ${right.name} Piece`,
    icon: "\u2728",
    tier: Math.min(10, Math.max(left.tier, right.tier) + 1),
    rarity_weight: left.id === right.id ? 35 : 65,
  };

  return { left, right, result, is_new_discovery: true };
}

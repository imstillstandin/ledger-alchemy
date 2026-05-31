export type DemoItem = { id: number; name: string; icon: string; tier: number; rarity_weight: number };

export const DEMO_MODE_KEY = "ledger_alchemy_demo";

export const demoItems: DemoItem[] = [
  { id: 1, name: "Carbon", icon: "C", tier: 1, rarity_weight: 120 },
  { id: 2, name: "Copper", icon: "Cu", tier: 1, rarity_weight: 120 },
  { id: 3, name: "Signal", icon: "Sg", tier: 1, rarity_weight: 115 },
  { id: 4, name: "Lens", icon: "Ln", tier: 1, rarity_weight: 110 },
  { id: 5, name: "Circuit", icon: "Ci", tier: 2, rarity_weight: 92 },
  { id: 6, name: "Pressure", icon: "Pr", tier: 2, rarity_weight: 88 },
  { id: 7, name: "Clock Pulse", icon: "Cp", tier: 3, rarity_weight: 74 },
  { id: 8, name: "Ledger Hash", icon: "#", tier: 3, rarity_weight: 68 },
];

const demoFormulaResults: Record<string, DemoItem> = {
  "1:2": { id: 101, name: "Conductive Carbon", icon: "Cc", tier: 2, rarity_weight: 82 },
  "1:4": { id: 102, name: "Carbon Aperture", icon: "Ca", tier: 2, rarity_weight: 84 },
  "1:6": { id: 103, name: "Graphene Sheet", icon: "Gs", tier: 3, rarity_weight: 58 },
  "2:3": { id: 104, name: "Carrier Trace", icon: "Ct", tier: 2, rarity_weight: 86 },
  "2:5": { id: 105, name: "Copper Bus", icon: "Cb", tier: 3, rarity_weight: 64 },
  "3:4": { id: 106, name: "Focused Signal", icon: "Fs", tier: 2, rarity_weight: 78 },
  "3:7": { id: 107, name: "Timed Signal", icon: "Ts", tier: 4, rarity_weight: 48 },
  "4:8": { id: 108, name: "Hash Lens", icon: "Hl", tier: 4, rarity_weight: 44 },
  "5:7": { id: 109, name: "Sequencer Board", icon: "Sb", tier: 4, rarity_weight: 42 },
  "6:8": { id: 110, name: "Compressed Proof", icon: "Cp", tier: 5, rarity_weight: 34 },
  "7:8": { id: 111, name: "Ledger Sequence", icon: "Ls", tier: 5, rarity_weight: 28 },
};

function formulaKey(leftId: number, rightId: number) {
  return [leftId, rightId].sort((a, b) => a - b).join(":");
}

function fallbackResult(left: DemoItem, right: DemoItem): DemoItem {
  const strongestTier = Math.max(left.tier, right.tier);
  const stableId = 200 + left.id * 17 + right.id * 19;

  return {
    id: stableId,
    name: `${left.name} ${right.name} Pattern`,
    icon: "Pt",
    tier: Math.min(10, strongestTier + 1),
    rarity_weight: left.id === right.id ? 42 : Math.max(30, 78 - strongestTier * 8),
  };
}

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
  const result = demoFormulaResults[formulaKey(left.id, right.id)] || fallbackResult(left, right);

  return { left, right, result, is_new_discovery: true };
}

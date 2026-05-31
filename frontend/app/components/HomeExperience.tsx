"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { api, clearToken, getToken } from "../lib/api";
import { demoCraft, demoItems, isDemoMode, setDemoMode } from "../lib/demo";
import { rarityLabel } from "../lib/rarity";

type Item = { id: number; name: string; icon: string; tier: number; rarity_weight: number };
type RevealState = "idle" | "calibrating" | "accelerating" | "locking" | "revealed";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex",
      padding: "6px 10px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      fontSize: 12
    }}>{children}</span>
  );
}

function rarityTone(label: string) {
  if (label === "Mythic") return { color: "#d9b76f", glow: "rgba(217, 183, 111, 0.18)" };
  if (label === "Epic") return { color: "#b79a72", glow: "rgba(183, 154, 114, 0.15)" };
  if (label === "Rare") return { color: "#c8c1ad", glow: "rgba(200, 193, 173, 0.14)" };
  if (label === "Uncommon") return { color: "#a99162", glow: "rgba(169, 145, 98, 0.12)" };
  return { color: "#d8d0bd", glow: "rgba(216, 208, 189, 0.10)" };
}

function craftRarityLabel(label: string) {
  return label === "Mythic" ? "Legendary" : label;
}

function rarityClassName(label: string) {
  if (label === "Mythic" || label === "Legendary") return "is-legendary";
  if (label === "Epic") return "is-epic";
  if (label === "Rare") return "is-rare";
  return "is-common";
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function useAnimatedCount(target: number) {
  const [value, setValue] = useState(target);
  const mountedRef = useRef(false);
  const valueRef = useRef(target);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      valueRef.current = target;
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    valueRef.current = target;

    const duration = 720;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      setValue(current);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function craftFailureCopy(message: string | null | undefined) {
  const normalized = (message || "").toLowerCase();
  if (normalized.includes("already") || normalized.includes("exists") || normalized.includes("duplicate")) {
    return "This formula is already in the Archive.";
  }
  return "No reaction found. Try another pairing.";
}

function fusionTimingForRarity(label: string) {
  if (label === "Mythic" || label === "Legendary") {
    return { stageA: 520, stageB: 700, stageC: 560, revealMs: 1120, hintDelayMs: 1560 };
  }
  if (label === "Epic") {
    return { stageA: 480, stageB: 640, stageC: 500, revealMs: 1000, hintDelayMs: 1400 };
  }
  if (label === "Rare") {
    return { stageA: 440, stageB: 580, stageC: 440, revealMs: 900, hintDelayMs: 1260 };
  }
  return { stageA: 400, stageB: 540, stageC: 400, revealMs: 820, hintDelayMs: 1140 };
}

const componentContentVariants: Variants = {
  idle: { scale: 1, x: 0, filter: "blur(0px) brightness(1)" },
  ready: {
    scale: [1, 1.035, 1],
    x: 0,
    filter: "blur(0px) brightness(1.06)",
    transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
  },
  calibrating: {
    scale: 1.08,
    x: 0,
    filter: "blur(0px) brightness(1.16)",
    transition: { duration: 0.45, ease: "easeOut" }
  },
  acceleratingLeft: {
    scale: 1.02,
    x: "42vw",
    filter: "blur(1px) brightness(1.22)",
    transition: { duration: 0.75, ease: [0.2, 0.72, 0.22, 1] }
  },
  acceleratingRight: {
    scale: 1.02,
    x: "-42vw",
    filter: "blur(1px) brightness(1.22)",
    transition: { duration: 0.75, ease: [0.2, 0.72, 0.22, 1] }
  },
  locking: {
    scale: 0.98,
    x: 0,
    filter: "blur(0px) brightness(0.82)",
    transition: { duration: 0.85, ease: "easeInOut" }
  },
  revealed: {
    scale: 0.96,
    x: 0,
    filter: "blur(0px) brightness(0.72)",
    transition: { duration: 0.35, ease: "easeOut" }
  }
};

const focusOrbVariants: Variants = {
  idle: { opacity: 1, scale: 1, filter: "brightness(1)" },
  ready: {
    opacity: 1,
    scale: [1, 1.04, 1],
    filter: "brightness(1.08)",
    transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
  },
  calibrating: { opacity: 1, scale: 1.05, filter: "brightness(1.18)", transition: { duration: 0.45 } },
  accelerating: { opacity: 1, scale: 0.96, filter: "brightness(1.28)", transition: { duration: 0.75 } },
  locking: {
    opacity: 1,
    scale: [0.96, 1.12, 1],
    filter: "brightness(1.45)",
    transition: { duration: 0.9, ease: "easeInOut" }
  },
  revealed: { opacity: 0, scale: 0.75, transition: { duration: 0.25 } }
};

const focusTriadVariants: Variants = {
  hidden: { opacity: 0, scale: 0.82, rotate: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.65, ease: "easeOut" }
  }
};

const fuseButtonVariants: Variants = {
  idle: { filter: "brightness(1)" },
  ready: {
    filter: ["brightness(1)", "brightness(1.08)", "brightness(1)"],
    transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
  },
  pressed: { scaleY: 0.9, filter: "brightness(1.18)", transition: { duration: 0.12, ease: "easeOut" } },
  busy: { filter: "brightness(1.12)", transition: { duration: 0.2 } }
};

function fusingCopyForRarity(label: string) {
  if (label === "Mythic" || label === "Legendary") return "Resolving the Archive...";
  if (label === "Epic") return "Resolving deeper paths...";
  if (label === "Rare") return "Tracing the connection...";
  return "Resolving...";
}

function strongerRarityLabel(left: Item | null, right: Item | null) {
  const rank: Record<string, number> = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Mythic: 5, Legendary: 5 };
  const labels = [left, right].filter(Boolean).map((item) => rarityLabel((item as Item).rarity_weight));
  return labels.sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0] || "Common";
}

function componentSequence(item: Item) {
  return Math.max(1, item.tier + Math.floor(Math.max(0, item.id - 1) / 8));
}

function componentSignal(item: Item) {
  const name = item.name.toLowerCase();
  if (["fire", "water", "earth", "air"].some((token) => name.includes(token))) return "Core";
  if (["moon", "sun", "star", "signal", "celestial"].some((token) => name.includes(token))) return "Signal";
  if (["salt", "glass", "crystal", "metal", "stone"].some((token) => name.includes(token))) return "Material";
  if (item.tier >= 4) return "Complex";
  return "Pattern";
}

function componentPattern(item: Item) {
  const rarity = rarityLabel(item.rarity_weight);
  if (rarity === "Common" || rarity === "Uncommon") return null;
  const found = Math.max(1, item.id);
  return `${found} / 5000 Found`;
}

type DrawerState = "collapsed" | "half" | "full";
type ArchiveFilter = "all" | "common" | "uncommon" | "rare" | "epic" | "mythic";

export function FusionResultCard({ result }: { result: any }) {
  const rarity = rarityLabel(result.result.rarity_weight);
  const tone = rarityTone(rarity);
  const isNew = result.is_new_discovery;
  const discoveryNumber = String(result.result.id ?? 0).padStart(3, "0");
  const rarityClass = rarityClassName(rarity);
  const timing = fusionTimingForRarity(rarity);

  return (
    <div className={`fusion-core-result ${rarityClass}`} style={{ ["--fusion-reveal-ms" as any]: `${timing.revealMs}ms` }}>
      <div className="rarity-motion-field" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="fusion-core-result__index">Discovery #{discoveryNumber}</div>
      <div className="fusion-core-result__meta">{isNew ? "New Discovery" : "Known Formula"}</div>
      <div className="fusion-core-result__plate">
        <div className="fusion-core-result__icon">{result.result.icon}</div>
      </div>
      <div className="fusion-core-result__name">{result.result.name}</div>
      <div className="fusion-core-result__rarity" style={{ color: tone.color }}>
        {craftRarityLabel(rarity)}
      </div>
      <div className="fusion-core-result__tier">T{result.result.tier}</div>
      <div className="fusion-core-result__found">{result.result.id ?? discoveryNumber} / 5000 Found</div>
    </div>
  );
}

function SelectedComponentBody({ item }: { item: Item }) {
  return (
    <div className="selected-component-body">
      <div className="selected-component-body__icon">
        {item.icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="selected-component-body__name">{item.name}</div>
        <div className="selected-component-body__rarity">
          Tier {item.tier} - {craftRarityLabel(rarityLabel(item.rarity_weight))}
        </div>
      </div>
    </div>
  );
}

function RarityBadge({ item }: { item: Item }) {
  const rarity = rarityLabel(item.rarity_weight);
  const tone = rarityTone(rarity);

  return (
    <span className="rarity-badge" style={{ color: tone.color, borderColor: tone.color }}>
      T{item.tier} - {craftRarityLabel(rarity)}
    </span>
  );
}

export function FusionSlot({
  side,
  label,
  item,
  active,
  dimmed,
  disabled,
  revealState,
  ready,
  errorPulse,
  onSelect,
  onClear
}: {
  side: "left" | "right";
  label: string;
  item: Item | null;
  active: boolean;
  dimmed: boolean;
  disabled: boolean;
  revealState: RevealState;
  ready: boolean;
  errorPulse: number;
  onSelect: () => void;
  onClear: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [shaking, setShaking] = useState(false);
  const motionState = !item || reduceMotion
    ? "idle"
    : revealState === "accelerating"
      ? side === "left" ? "acceleratingLeft" : "acceleratingRight"
      : revealState === "idle" && ready
        ? "ready"
        : revealState;

  useEffect(() => {
    if (!errorPulse) return;
    setShaking(true);
    const timeout = window.setTimeout(() => setShaking(false), 250);
    return () => window.clearTimeout(timeout);
  }, [errorPulse]);

  return (
    <button
      className={`fusion-slot fusion-slot-card is-${side} ${item ? "is-bound" : ""} ${active ? "is-active" : ""} ${dimmed ? "is-dimmed" : ""} ${shaking ? "is-error-shake" : ""}`}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onSelect}
    >
      <div className="fusion-slot-card__header">
        <div className="fusion-slot-card__label">{label}</div>
        {item && (
          <span
            className="fusion-slot-card__clear"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Clear ${label}`}
            onClick={(event) => { event.stopPropagation(); onClear(); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onClear();
              }
            }}
          >
            Clear
          </span>
        )}
      </div>
      {item ? (
        <motion.div className="fusion-slot-card__content" variants={componentContentVariants} animate={motionState}>
          <SelectedComponentBody item={item} />
        </motion.div>
      ) : (
        <div className="fusion-slot-card__empty">Choose a component from the archive.</div>
      )}
    </button>
  );
}

function DiscoveryHintPanel({
  result,
  items,
  onUseResult,
  onUseSuggestion
}: {
  result: any;
  items: Item[];
  onUseResult: (slot: "left" | "right") => void;
  onUseSuggestion: (ingredientId: number) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (!result) return null;
  if (dismissed) return null;

  const resultItem = result.result as Item;
  const knownSuggestions = items
    .filter((item) => item.id !== resultItem.id)
    .sort((a, b) => {
      const preferred = (item: Item) => {
        const name = item.name.toLowerCase();
        if (name.includes("air")) return 0;
        if (name.includes("moon salt")) return 1;
        return 2;
      };
      return preferred(a) - preferred(b) || a.tier - b.tier || a.id - b.id;
    })
    .slice(0, 2);

  return (
    <div className="discovery-hint-panel">
      <button className="discovery-hint-panel__dismiss" type="button" onClick={() => setDismissed(true)} aria-label="Dismiss discovery hint">
        Dismiss
      </button>
      <div className="discovery-hint-panel__eyebrow">New sequences unlocked</div>
      <div className="discovery-hint-panel__text">{resultItem.name} can now fuse with:</div>
      <div className="discovery-hint-panel__chips">
        {knownSuggestions.map((item) => (
          <button key={item.id} type="button" onClick={() => onUseSuggestion(item.id)}>
            ? {item.name}
          </button>
        ))}
        <span>? Unknown</span>
      </div>
      <div className="discovery-actions">
        <button type="button" onClick={() => onUseResult("left")}>Use as first path</button>
        <button type="button" onClick={() => onUseResult("right")}>Use as second path</button>
      </div>
    </div>
  );
}

export function FusionStage({
  result,
  revealState,
  ready,
  loadingCopy,
  items,
  selectedLeft,
  selectedRight,
  onUseResult,
  onUseSuggestion
}: {
  result: any;
  revealState: RevealState;
  ready: boolean;
  loadingCopy: string;
  items: Item[];
  selectedLeft: Item | null;
  selectedRight: Item | null;
  onUseResult: (slot: "left" | "right") => void;
  onUseSuggestion: (ingredientId: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const showIngress = revealState === "calibrating" || revealState === "accelerating" || revealState === "locking";
  const showResult = revealState === "revealed" && !!result;
  const resultRarity = showResult ? rarityClassName(rarityLabel(result.result.rarity_weight)) : "";

  return (
    <div className={`fusion-core-stage ${showResult ? `is-${resultRarity}` : ""} is-${revealState}`}>
      <div className="fusion-core-stage__shell">
        <div className="fusion-core-stage__surface" aria-hidden="true">
          <div className="fusion-core-stage__grid" />
          <div className="fusion-core-stage__stream fusion-core-stage__stream--left" />
          <div className="fusion-core-stage__stream fusion-core-stage__stream--right" />
          <div className="fusion-core-stage__node fusion-core-stage__node--left" />
          <div className="fusion-core-stage__node fusion-core-stage__node--right" />
          <div className="fusion-core-stage__node fusion-core-stage__node--center" />
        </div>
        <div className="fusion-core-stage__core">
          <div className="fusion-core-stage__ring fusion-core-stage__ring--outer" aria-hidden="true" />
          <div className="fusion-core-stage__ring fusion-core-stage__ring--inner" aria-hidden="true" />
          <div className="fusion-core-stage__pulse" aria-hidden="true" />
          {showIngress && selectedLeft && selectedRight && (
            <div className="fusion-core-stage__ingress" aria-hidden="true">
              <div className="fusion-core-stage__token is-left">
                <div className="fusion-core-stage__token-icon">{selectedLeft.icon}</div>
                <div className="fusion-core-stage__token-text">
                  <div>{selectedLeft.name}</div>
                  <small>T{selectedLeft.tier} · {craftRarityLabel(rarityLabel(selectedLeft.rarity_weight))}</small>
                </div>
              </div>
              <div className="fusion-core-stage__token is-right">
                <div className="fusion-core-stage__token-icon">{selectedRight.icon}</div>
                <div className="fusion-core-stage__token-text">
                  <div>{selectedRight.name}</div>
                  <small>T{selectedRight.tier} · {craftRarityLabel(rarityLabel(selectedRight.rarity_weight))}</small>
                </div>
              </div>
            </div>
          )}
          <div className="fusion-core-stage__copy">
            <div className="fusion-core-stage__eyebrow">
              {ready ? "Ready to fuse" : revealState === "idle" ? "Unknown combination" : "Resolve in progress"}
            </div>
            <div className="fusion-core-stage__status">
              {revealState === "locking" ? loadingCopy : revealState === "accelerating" ? "Aligning the trace..." : "Tracing the connection..."}
            </div>
          </div>
          {showResult && (
            <motion.div
              className="fusion-core-stage__result"
              initial={{ opacity: 0, scale: 0.88, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <FusionResultCard result={result} />
            </motion.div>
          )}
        </div>
      </div>
      {showResult && <DiscoveryHintPanel result={result} items={items} onUseResult={onUseResult} onUseSuggestion={onUseSuggestion} />}
    </div>
  );
}

export function FuseButton({
  canCraft,
  revealState,
  busy,
  loadingCopy,
  onFuse
}: {
  canCraft: boolean;
  revealState: RevealState;
  busy: boolean;
  loadingCopy: string;
  onFuse: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const buttonState = busy ? "busy" : canCraft ? "ready" : "idle";
  const isLoading = revealState === "calibrating" || revealState === "accelerating" || revealState === "locking";
  const disabled = !canCraft && !isLoading;

  return (
    <motion.button
      className={`fusion-action fuse-button ${canCraft ? "is-ready" : ""} ${isLoading ? "is-loading" : ""}`}
      disabled={disabled}
      onClick={onFuse}
      variants={fuseButtonVariants}
      animate={reduceMotion ? "idle" : buttonState}
      whileHover={canCraft && !busy && !reduceMotion ? { filter: "brightness(1.1)" } : undefined}
      whileTap={canCraft && !busy && !reduceMotion ? "pressed" : undefined}
    >
      {isLoading ? loadingCopy : busy ? loadingCopy : canCraft ? "Begin fusion" : "Select two discoveries"}
    </motion.button>
  );
}

function ComponentCard({
  item,
  selected,
  selectedSlot,
  disabled,
  onChoose
}: {
  item: Item;
  selected: boolean;
  selectedSlot: "left" | "right" | null;
  disabled: boolean;
  onChoose: (itemId: number) => void;
}) {
  const rarity = rarityLabel(item.rarity_weight);
  const tone = rarityTone(rarity);
  const scarcity = componentPattern(item);

  return (
    <button
      className={`component-card ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
      key={item.id}
      type="button"
      aria-pressed={selected}
      aria-label={`${item.name}, ${craftRarityLabel(rarity)} tier ${item.tier}${selected ? ", selected" : ""}`}
      disabled={disabled}
      onClick={() => onChoose(item.id)}
      style={{
        background: selected
          ? `radial-gradient(circle at top left, ${tone.glow}, rgba(255,255,255,0.035)), linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))`
          : undefined,
        borderColor: selected ? tone.color : undefined,
        boxShadow: selected ? `0 0 18px ${tone.glow}, inset 0 1px 0 rgba(255,255,255,0.08)` : undefined
      }}
    >
      {selectedSlot && (
        <div className="component-card__selected-label">
          Selected as {selectedSlot === "left" ? "First Component" : "Second Component"}
        </div>
      )}
      <div className="component-card__topline">
        <div className="component-card__icon">{item.icon}</div>
        <RarityBadge item={item} />
      </div>
      <div className="component-card__name">{item.name}</div>
      <div className="component-card__subtitle">T{item.tier} - {craftRarityLabel(rarity)}</div>
      <div className="component-card__details">
        <span>Gen {componentSequence(item)}</span>
        <span>{componentSignal(item)}</span>
      </div>
      {scarcity && <div className="component-card__scarcity">{scarcity}</div>}
    </button>
  );
}

export function DiscoveryArchive({ items, left, right, inactive, onChoose }: { items: Item[]; left: number | null; right: number | null; inactive: boolean; onChoose: (itemId: number) => void }) {
  if (items.length === 0) {
    return <div className="discovery-archive-empty">No discoveries are loaded yet.</div>;
  }

  return (
    <div className={`discovery-archive item-ledger ${inactive ? "is-inactive" : ""}`}>
      {items.map((item) => (
        <ComponentCard
          key={item.id}
          item={item}
          selected={item.id === left || item.id === right}
          selectedSlot={item.id === left ? "left" : item.id === right ? "right" : null}
          disabled={inactive}
          onChoose={onChoose}
        />
      ))}
    </div>
  );
}

export function ProgressStatsRail({ items }: { items: Item[] }) {
  const discoveredCount = useAnimatedCount(items.length);
  const rarityCounts = useMemo(() => {
    const counts = { rare: 0, epic: 0, legendary: 0 };

    for (const item of items) {
      const rarity = rarityLabel(item.rarity_weight);
      if (rarity === "Rare") counts.rare += 1;
      if (rarity === "Epic") counts.epic += 1;
      if (rarity === "Mythic") counts.legendary += 1;
    }

    return counts;
  }, [items]);

  const [pulseSeq, setPulseSeq] = useState({ rare: 0, epic: 0, legendary: 0 });
  const previousCountsRef = useRef(rarityCounts);

  useEffect(() => {
    const previous = previousCountsRef.current;
    if (previous.rare !== rarityCounts.rare) setPulseSeq((current) => ({ ...current, rare: current.rare + 1 }));
    if (previous.epic !== rarityCounts.epic) setPulseSeq((current) => ({ ...current, epic: current.epic + 1 }));
    if (previous.legendary !== rarityCounts.legendary) setPulseSeq((current) => ({ ...current, legendary: current.legendary + 1 }));
    previousCountsRef.current = rarityCounts;
  }, [rarityCounts]);

  return (
    <div className="progress-stats-rail" aria-label="Progress stats">
      <div className="progress-stats-rail__card">
        <span className="progress-stats-rail__value">{discoveredCount}</span>
        <small>Discovered</small>
      </div>
      <div className={`progress-stats-rail__card ${pulseSeq.rare ? "is-pulsing" : ""}`}>
        <motion.span
          className="progress-stats-rail__value"
          key={pulseSeq.rare}
          animate={pulseSeq.rare ? { scale: [1, 1.11, 1] } : { scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          {rarityCounts.rare}
        </motion.span>
        <small>Rare</small>
      </div>
      <div className={`progress-stats-rail__card ${pulseSeq.epic ? "is-pulsing" : ""}`}>
        <motion.span
          className="progress-stats-rail__value"
          key={pulseSeq.epic}
          animate={pulseSeq.epic ? { scale: [1, 1.11, 1] } : { scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          {rarityCounts.epic}
        </motion.span>
        <small>Epic</small>
      </div>
      <div className={`progress-stats-rail__card ${pulseSeq.legendary ? "is-pulsing" : ""}`}>
        <motion.span
          className="progress-stats-rail__value"
          key={pulseSeq.legendary}
          animate={pulseSeq.legendary ? { scale: [1, 1.11, 1] } : { scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          {rarityCounts.legendary}
        </motion.span>
        <small>Legendary</small>
      </div>
    </div>
  );
}

export function MobileCollectionDrawer({
  items,
  left,
  right,
  inactive,
  state,
  onStateChange,
  onChoose
}: {
  items: Item[];
  left: number | null;
  right: number | null;
  inactive: boolean;
  state: DrawerState;
  onStateChange: (state: DrawerState) => void;
  onChoose: (itemId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  const count = items.length;
  const recentItems = useMemo(() => [...items].slice(-4).reverse(), [items]);
  const favoriteItems = useMemo(() => {
    const selected = items.filter((item) => item.id === left || item.id === right);
    const ranked = [...items].sort((a, b) => {
      const ra = rarityLabel(a.rarity_weight);
      const rb = rarityLabel(b.rarity_weight);
      const order: Record<string, number> = { Mythic: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
      return (order[rb] || 0) - (order[ra] || 0) || b.tier - a.tier || b.id - a.id;
    });
    const merged = [...selected, ...ranked];
    const seen = new Set<number>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 4);
  }, [items, left, right]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const rarity = rarityLabel(item.rarity_weight).toLowerCase() as ArchiveFilter;
      const matchesSearch = !query || [item.name, item.icon, `T${item.tier}`].some((value) => value.toLowerCase().includes(query));
      const matchesFilter = filter === "all" || filter === rarity;
      return matchesSearch && matchesFilter;
    });
  }, [filter, items, search]);

  const drawerLabel = state === "collapsed" ? "Collapsed" : state === "half" ? "Half" : "Full";
  const nextState: DrawerState = state === "collapsed" ? "half" : state === "half" ? "full" : "collapsed";
  const showFull = state === "full";
  const showHalf = state === "half";
  const showCollapsed = state === "collapsed";

  return (
    <section className={`mobile-collection-drawer is-${state} ${inactive ? "is-inactive" : ""}`}>
      <div className="mobile-collection-drawer__header">
        <div>
          <div className="mobile-collection-drawer__eyebrow">Collection</div>
          <h3>Discovery Archive</h3>
        </div>
        <button
          className="mobile-collection-drawer__toggle"
          type="button"
          aria-controls="mobile-collection-drawer-body"
          aria-expanded={state !== "collapsed"}
          aria-label={state === "collapsed" ? "Open discovery archive" : state === "half" ? "Expand discovery archive" : "Collapse discovery archive"}
          onClick={() => onStateChange(nextState)}
        >
          {state === "collapsed" ? "Open" : state === "half" ? "Expand" : "Collapse"}
        </button>
      </div>
      <div className="mobile-collection-drawer__state">{drawerLabel} - Archive - {count} discoveries</div>
      <div className="mobile-collection-drawer__body" id="mobile-collection-drawer-body">
        {showCollapsed && (
          <div className="mobile-collection-drawer__collapsed">
            Tap to expand the archive.
          </div>
        )}

        {showHalf && (
          <div className="mobile-collection-drawer__groups">
            <div className="mobile-collection-drawer__group">
              <div className="mobile-collection-drawer__group-title">Recent</div>
              <DiscoveryArchive
                items={recentItems}
                left={left}
                right={right}
                inactive={inactive}
                onChoose={onChoose}
              />
            </div>
            <div className="mobile-collection-drawer__group">
              <div className="mobile-collection-drawer__group-title">Favorites</div>
              <DiscoveryArchive
                items={favoriteItems}
                left={left}
                right={right}
                inactive={inactive}
                onChoose={onChoose}
              />
            </div>
          </div>
        )}

        {showFull && (
          <div className="mobile-collection-drawer__full">
            <div className="mobile-collection-drawer__search-row">
              <input
                aria-label="Search discoveries"
                className="mobile-collection-drawer__search"
                type="search"
                placeholder="Search discoveries"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="mobile-collection-drawer__filters" role="tablist" aria-label="Discovery filters">
              {(["all", "common", "uncommon", "rare", "epic", "mythic"] as ArchiveFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`mobile-collection-drawer__filter ${filter === option ? "is-active" : ""}`}
                  onClick={() => setFilter(option)}
                >
                  {option === "all" ? "All" : option === "mythic" ? "Legendary" : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            <DiscoveryArchive
              items={filteredItems}
              left={left}
              right={right}
              inactive={inactive}
              onChoose={onChoose}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export function FusionWorkspace({
  items,
  selectedLeft,
  selectedRight,
  activeSlot,
  revealState,
  result,
  canCraft,
  busy,
  errorMessage,
  onSelectSlot,
  onClearLeft,
  onClearRight,
  onUseResult,
  onUseSuggestion,
  errorPulse,
  onFuse
}: {
  items: Item[];
  selectedLeft: Item | null;
  selectedRight: Item | null;
  activeSlot: "left" | "right";
  revealState: RevealState;
  result: any;
  canCraft: boolean;
  busy: boolean;
  errorMessage: string | null;
  onSelectSlot: (slot: "left" | "right") => void;
  onClearLeft: () => void;
  onClearRight: () => void;
  onUseResult: (slot: "left" | "right") => void;
  onUseSuggestion: (ingredientId: number) => void;
  errorPulse: number;
  onFuse: () => void;
}) {
  const anticipating = revealState === "calibrating" || revealState === "accelerating" || revealState === "locking";
  const ready = revealState === "idle" && canCraft;
  const fullscreenMode = revealState !== "idle" || busy || !!result;
  const fusionRarity = strongerRarityLabel(selectedLeft, selectedRight);
  const timing = fusionTimingForRarity(fusionRarity);
  const loadingCopy = fusingCopyForRarity(fusionRarity);
  const revealedRarityClass = revealState === "revealed" && result ? rarityClassName(rarityLabel(result.result.rarity_weight)) : "";

  return (
    <div
      className={`fusion-chamber fusion-workspace is-${revealState} ${revealedRarityClass} ${ready ? "is-ready" : ""} ${anticipating ? "is-anticipating" : ""} ${fullscreenMode ? "is-fullscreen" : ""}`}
      style={{
        ["--fusion-stage-a-ms" as any]: `${timing.stageA}ms`,
        ["--fusion-stage-b-ms" as any]: `${timing.stageB}ms`,
        ["--fusion-stage-c-ms" as any]: `${timing.stageC}ms`,
        ["--fusion-reveal-ms" as any]: `${timing.revealMs}ms`,
        ["--fusion-hint-delay-ms" as any]: `${timing.hintDelayMs}ms`
      }}
    >
      {anticipating && selectedLeft && selectedRight && (
        <div className="fusion-orb-layer" aria-hidden="true">
          <div className="fusion-ghost-orb is-left"><span>{selectedLeft.icon}</span><strong>{selectedLeft.name}</strong></div>
          <div className="fusion-ghost-orb is-right"><span>{selectedRight.icon}</span><strong>{selectedRight.name}</strong></div>
        </div>
      )}
      <div className="fusion-slots">
        <FusionSlot
          side="left"
          label="First Component"
          item={selectedLeft}
          active={activeSlot === "left"}
          dimmed={anticipating || revealState === "revealed"}
          disabled={anticipating}
          revealState={revealState}
          ready={ready}
          errorPulse={errorPulse}
          onSelect={() => onSelectSlot("left")}
          onClear={onClearLeft}
        />
        <div className="fusion-core" aria-live="polite">
          <FusionStage
            result={result}
            revealState={revealState}
            ready={ready}
            loadingCopy={loadingCopy}
            items={items}
            selectedLeft={selectedLeft}
            selectedRight={selectedRight}
            onUseResult={onUseResult}
            onUseSuggestion={onUseSuggestion}
          />
        </div>
        <FusionSlot
          side="right"
          label="Second Component"
          item={selectedRight}
          active={activeSlot === "right"}
          dimmed={anticipating || revealState === "revealed"}
          disabled={anticipating}
          revealState={revealState}
          ready={ready}
          errorPulse={errorPulse}
          onSelect={() => onSelectSlot("right")}
          onClear={onClearRight}
        />
      </div>
      <div className="fusion-action-row">
        {anticipating && <div className="fuse-energy-trace" aria-hidden="true" />}
        <FuseButton canCraft={canCraft} revealState={revealState} busy={busy} loadingCopy={loadingCopy} onFuse={onFuse} />
      </div>
      {errorMessage && <div className="craft-error" role="status">{errorMessage}</div>}
    </div>
  );
}

function ArchiveChamber({ children, drawerState, fusionActive }: { children: React.ReactNode; drawerState: DrawerState; fusionActive: boolean }) {
  return (
    <section className={`alchemy-panel archive-chamber ${fusionActive ? "is-fusion-active" : ""}`} data-drawer-state={drawerState}>
      {children}
    </section>
  );
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<"left" | "right">("left");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealState, setRevealState] = useState<RevealState>("idle");
  const [errorPulse, setErrorPulse] = useState(0);
  const [drawerState, setDrawerState] = useState<DrawerState>("full");
  const [mounted, setMounted] = useState(false);
  const [demo, setDemo] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [canStartDemo, setCanStartDemo] = useState(false);

  const authed = demo || hasToken;
  const anticipating = revealState === "calibrating" || revealState === "accelerating" || revealState === "locking";
  const fusionModeActive = revealState !== "idle" || busy || !!result;

  useEffect(() => {
    setMounted(true);
    setHasToken(!!getToken());
    const mq = window.matchMedia("(max-width: 767px)");
    const applyDrawerState = () => setDrawerState(mq.matches ? "collapsed" : "full");
    applyDrawerState();
    mq.addEventListener("change", applyDrawerState);

    if (isDemoMode()) {
      setDemo(true);
      setItems(demoItems);
      return () => mq.removeEventListener("change", applyDrawerState);
    }

    api.items().then(setItems).catch(e => {
      setErr(e.message);
      setCanStartDemo(true);
    });
    return () => mq.removeEventListener("change", applyDrawerState);
  }, []);

  const canCraft = !!(authed && left && right && !busy);

  function clearCraftError() {
    setErr(null);
  }

  function clearSelectedComponent() {
    clearCraftError();
    if (activeSlot === "left" && left !== null) {
      setLeft(null);
      return;
    }
    if (activeSlot === "right" && right !== null) {
      setRight(null);
      return;
    }
    if (left !== null) {
      setLeft(null);
      return;
    }
    if (right !== null) {
      setRight(null);
    }
  }

  async function doCraft() {
    setErr(null);
    setResult(null);
    setBusy(true);
    setRevealState("calibrating");
    try {
      const fusionTiming = fusionTimingForRarity(strongerRarityLabel(selectedLeft, selectedRight));
      const craftPromise = demo ? Promise.resolve(demoCraft(left!, right!)) : api.craft(left!, right!);
      await sleep(fusionTiming.stageA);
      setRevealState("accelerating");
      await sleep(fusionTiming.stageB);
      setRevealState("locking");
      const [res] = await Promise.all([craftPromise, sleep(fusionTiming.stageC)]);
      setItems((current) => current.some((item) => item.id === res.result.id) ? current : [...current, res.result]);
      setResult(res);
      setRevealState("revealed");
    } catch (e: any) {
      setErr(craftFailureCopy(e?.message));
      setErrorPulse((value) => value + 1);
      setRevealState("idle");
    } finally {
      setBusy(false);
    }
  }

  function startDemo() {
    setDemoMode(true);
    setDemo(true);
    setCanStartDemo(false);
    clearCraftError();
    setErrorPulse(0);
    setItems(demoItems);
    setLeft(null);
    setRight(null);
    setResult(null);
    setRevealState("idle");
  }

  function exitDemo() {
    setDemoMode(false);
    setDemo(false);
    setHasToken(false);
    setItems([]);
    setLeft(null);
    setRight(null);
    setResult(null);
    setErr(null);
    setRevealState("idle");
    location.reload();
  }

  const selectedLeft = useMemo(() => items.find(i => i.id === left) || null, [items, left]);
  const selectedRight = useMemo(() => items.find(i => i.id === right) || null, [items, right]);

  function chooseItem(itemId: number) {
    clearCraftError();
    if (revealState === "revealed") {
      setResult(null);
      setRevealState("idle");
    }

    if (activeSlot === "left") {
      setLeft(itemId);
      setActiveSlot("right");
    } else {
      setRight(itemId);
      setActiveSlot("left");
    }
  }

  function useResultAsComponent(slot: "left" | "right") {
    if (!result?.result) return;

    clearCraftError();
    const resultItem = result.result as Item;
    setItems((current) => current.some((item) => item.id === resultItem.id) ? current : [...current, resultItem]);
    setResult(null);
    setRevealState("idle");

    if (slot === "left") {
      setLeft(resultItem.id);
      setRight(null);
      setActiveSlot("right");
    } else {
      setRight(resultItem.id);
      setLeft(null);
      setActiveSlot("left");
    }
  }

  function useSuggestedPath(ingredientId: number) {
    if (!result?.result) return;

    clearCraftError();
    const resultItem = result.result as Item;
    setItems((current) => current.some((item) => item.id === resultItem.id) ? current : [...current, resultItem]);
    setLeft(resultItem.id);
    setRight(ingredientId);
    setActiveSlot("left");
    setResult(null);
    setRevealState("idle");
  }

  if (!mounted) {
    return (
      <main className="craft-screen">
        <div className="craft-background" aria-hidden="true">
          <div className="craft-background__layer craft-background__layer--far" />
          <div className="craft-background__layer craft-background__layer--mid" />
          <div className="craft-background__layer craft-background__layer--near" />
          <div className="craft-background__traces">
            <i style={{ ["--x" as any]: "8%", ["--y" as any]: "18%", ["--w" as any]: "18%", ["--angle" as any]: "12deg", ["--dur" as any]: "38s", ["--delay" as any]: "-9s" }} />
            <i style={{ ["--x" as any]: "20%", ["--y" as any]: "58%", ["--w" as any]: "14%", ["--angle" as any]: "-18deg", ["--dur" as any]: "46s", ["--delay" as any]: "-21s" }} />
            <i style={{ ["--x" as any]: "52%", ["--y" as any]: "26%", ["--w" as any]: "20%", ["--angle" as any]: "8deg", ["--dur" as any]: "52s", ["--delay" as any]: "-16s" }} />
            <i style={{ ["--x" as any]: "67%", ["--y" as any]: "68%", ["--w" as any]: "16%", ["--angle" as any]: "21deg", ["--dur" as any]: "43s", ["--delay" as any]: "-5s" }} />
            <i style={{ ["--x" as any]: "80%", ["--y" as any]: "36%", ["--w" as any]: "13%", ["--angle" as any]: "-11deg", ["--dur" as any]: "57s", ["--delay" as any]: "-28s" }} />
          </div>
          <div className="craft-background__nodes">
            <span style={{ ["--x" as any]: "12%", ["--y" as any]: "22%", ["--dur" as any]: "5.6s", ["--delay" as any]: "-1.8s" }} />
            <span style={{ ["--x" as any]: "28%", ["--y" as any]: "62%", ["--dur" as any]: "6.8s", ["--delay" as any]: "-4.1s" }} />
            <span style={{ ["--x" as any]: "45%", ["--y" as any]: "30%", ["--dur" as any]: "7.2s", ["--delay" as any]: "-2.9s" }} />
            <span style={{ ["--x" as any]: "60%", ["--y" as any]: "70%", ["--dur" as any]: "5.9s", ["--delay" as any]: "-5.4s" }} />
            <span style={{ ["--x" as any]: "76%", ["--y" as any]: "24%", ["--dur" as any]: "6.4s", ["--delay" as any]: "-3.5s" }} />
            <span style={{ ["--x" as any]: "88%", ["--y" as any]: "54%", ["--dur" as any]: "7.8s", ["--delay" as any]: "-6.2s" }} />
          </div>
          <div className="craft-background__particles">
            <span style={{ ["--x" as any]: "6%", ["--y" as any]: "16%", ["--dur" as any]: "28s", ["--delay" as any]: "-11s" }} />
            <span style={{ ["--x" as any]: "14%", ["--y" as any]: "76%", ["--dur" as any]: "34s", ["--delay" as any]: "-23s" }} />
            <span style={{ ["--x" as any]: "34%", ["--y" as any]: "44%", ["--dur" as any]: "31s", ["--delay" as any]: "-6s" }} />
            <span style={{ ["--x" as any]: "48%", ["--y" as any]: "82%", ["--dur" as any]: "37s", ["--delay" as any]: "-19s" }} />
            <span style={{ ["--x" as any]: "63%", ["--y" as any]: "12%", ["--dur" as any]: "29s", ["--delay" as any]: "-14s" }} />
            <span style={{ ["--x" as any]: "72%", ["--y" as any]: "40%", ["--dur" as any]: "35s", ["--delay" as any]: "-27s" }} />
            <span style={{ ["--x" as any]: "86%", ["--y" as any]: "78%", ["--dur" as any]: "32s", ["--delay" as any]: "-9s" }} />
          </div>
        </div>
        <section className="alchemy-panel" style={{ borderRadius: 24, padding: 22 }}>
          <div style={{ color: "rgba(230,233,242,0.72)", fontSize: 14 }}>Preparing ledger...</div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`craft-screen ${fusionModeActive ? "is-fusion-active" : ""}`}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && !isEditableTarget(event.target)) {
          event.preventDefault();
          clearSelectedComponent();
        }
      }}
    >
      <div className="craft-background" aria-hidden="true">
        <div className="craft-background__layer craft-background__layer--far" />
        <div className="craft-background__layer craft-background__layer--mid" />
        <div className="craft-background__layer craft-background__layer--near" />
        <div className="craft-background__traces">
          <i style={{ ["--x" as any]: "8%", ["--y" as any]: "18%", ["--w" as any]: "18%", ["--angle" as any]: "12deg", ["--dur" as any]: "38s", ["--delay" as any]: "-9s" }} />
          <i style={{ ["--x" as any]: "20%", ["--y" as any]: "58%", ["--w" as any]: "14%", ["--angle" as any]: "-18deg", ["--dur" as any]: "46s", ["--delay" as any]: "-21s" }} />
          <i style={{ ["--x" as any]: "52%", ["--y" as any]: "26%", ["--w" as any]: "20%", ["--angle" as any]: "8deg", ["--dur" as any]: "52s", ["--delay" as any]: "-16s" }} />
          <i style={{ ["--x" as any]: "67%", ["--y" as any]: "68%", ["--w" as any]: "16%", ["--angle" as any]: "21deg", ["--dur" as any]: "43s", ["--delay" as any]: "-5s" }} />
          <i style={{ ["--x" as any]: "80%", ["--y" as any]: "36%", ["--w" as any]: "13%", ["--angle" as any]: "-11deg", ["--dur" as any]: "57s", ["--delay" as any]: "-28s" }} />
        </div>
        <div className="craft-background__nodes">
          <span style={{ ["--x" as any]: "12%", ["--y" as any]: "22%", ["--dur" as any]: "5.6s", ["--delay" as any]: "-1.8s" }} />
          <span style={{ ["--x" as any]: "28%", ["--y" as any]: "62%", ["--dur" as any]: "6.8s", ["--delay" as any]: "-4.1s" }} />
          <span style={{ ["--x" as any]: "45%", ["--y" as any]: "30%", ["--dur" as any]: "7.2s", ["--delay" as any]: "-2.9s" }} />
          <span style={{ ["--x" as any]: "60%", ["--y" as any]: "70%", ["--dur" as any]: "5.9s", ["--delay" as any]: "-5.4s" }} />
          <span style={{ ["--x" as any]: "76%", ["--y" as any]: "24%", ["--dur" as any]: "6.4s", ["--delay" as any]: "-3.5s" }} />
          <span style={{ ["--x" as any]: "88%", ["--y" as any]: "54%", ["--dur" as any]: "7.8s", ["--delay" as any]: "-6.2s" }} />
        </div>
        <div className="craft-background__particles">
          <span style={{ ["--x" as any]: "6%", ["--y" as any]: "16%", ["--dur" as any]: "28s", ["--delay" as any]: "-11s" }} />
          <span style={{ ["--x" as any]: "14%", ["--y" as any]: "76%", ["--dur" as any]: "34s", ["--delay" as any]: "-23s" }} />
          <span style={{ ["--x" as any]: "34%", ["--y" as any]: "44%", ["--dur" as any]: "31s", ["--delay" as any]: "-6s" }} />
          <span style={{ ["--x" as any]: "48%", ["--y" as any]: "82%", ["--dur" as any]: "37s", ["--delay" as any]: "-19s" }} />
          <span style={{ ["--x" as any]: "63%", ["--y" as any]: "12%", ["--dur" as any]: "29s", ["--delay" as any]: "-14s" }} />
          <span style={{ ["--x" as any]: "72%", ["--y" as any]: "40%", ["--dur" as any]: "35s", ["--delay" as any]: "-27s" }} />
          <span style={{ ["--x" as any]: "86%", ["--y" as any]: "78%", ["--dur" as any]: "32s", ["--delay" as any]: "-9s" }} />
        </div>
      </div>
      <style>{`
        .craft-screen {
          position: relative;
          margin: -16px;
          padding: 16px;
          min-height: calc(100vh - 32px);
          overflow: hidden;
          isolation: isolate;
          background: linear-gradient(180deg, #04060b 0%, #070a11 44%, #04050a 100%);
        }

        .craft-screen > :not(.craft-background) {
          position: relative;
          z-index: 1;
        }

        .craft-screen.is-fusion-active {
          min-height: 100vh;
        }

        .craft-background {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .craft-background__layer {
          position: absolute;
          inset: -12%;
          opacity: 0.85;
        }

        .craft-background__layer--far {
          background:
            radial-gradient(circle at 18% 22%, rgba(103,232,249,0.07) 0 0.8%, transparent 1.4%),
            radial-gradient(circle at 72% 18%, rgba(245,211,107,0.06) 0 0.8%, transparent 1.4%),
            radial-gradient(circle at 28% 74%, rgba(184,115,255,0.06) 0 0.8%, transparent 1.4%),
            radial-gradient(circle at 84% 68%, rgba(245,211,107,0.05) 0 0.8%, transparent 1.4%);
          background-size: 28% 28%, 34% 34%, 30% 30%, 26% 26%;
          filter: blur(1px);
          animation: backgroundParallaxFar 78s linear infinite;
        }

        .craft-background__layer--mid {
          background:
            linear-gradient(115deg, transparent 0 49.2%, rgba(103,232,249,0.08) 49.35% 49.55%, transparent 49.7%),
            linear-gradient(28deg, transparent 0 43.4%, rgba(245,211,107,0.07) 43.55% 43.75%, transparent 44%),
            linear-gradient(152deg, transparent 0 71.5%, rgba(184,115,255,0.06) 71.65% 71.85%, transparent 72.1%),
            linear-gradient(65deg, transparent 0 18.5%, rgba(245,211,107,0.06) 18.7% 18.9%, transparent 19.3%);
          background-size: 42% 42%, 36% 36%, 48% 48%, 32% 32%;
          mix-blend-mode: screen;
          opacity: 0.45;
          animation: backgroundParallaxMid 54s linear infinite;
        }

        .craft-background__layer--near {
          background:
            repeating-linear-gradient(90deg, transparent 0 92px, rgba(255,255,255,0.025) 92px 93px, transparent 93px 188px),
            repeating-linear-gradient(0deg, transparent 0 112px, rgba(103,232,249,0.018) 112px 113px, transparent 113px 226px);
          opacity: 0.38;
          animation: backgroundParallaxNear 36s linear infinite;
        }

        .craft-background__traces,
        .craft-background__nodes,
        .craft-background__particles {
          position: absolute;
          inset: 0;
        }

        .craft-background__traces i {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: var(--w);
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(103,232,249,0.36), rgba(245,211,107,0.18), transparent);
          transform: rotate(var(--angle));
          transform-origin: left center;
          opacity: 0.24;
          filter: blur(0.15px);
          animation: traceDrift var(--dur) linear infinite;
          animation-delay: var(--delay);
        }

        .craft-background__nodes span {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(245,211,107,0.70);
          box-shadow: 0 0 0 1px rgba(245,211,107,0.20), 0 0 14px rgba(245,211,107,0.22);
          opacity: 0.54;
          animation: nodePulse var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .craft-background__nodes span::before,
        .craft-background__nodes span::after {
          content: "";
          position: absolute;
          inset: -16px;
          border-radius: inherit;
          border: 1px solid rgba(103,232,249,0.10);
          opacity: 0;
          animation: nodeRipple var(--dur) ease-out infinite;
          animation-delay: var(--delay);
        }

        .craft-background__nodes span::after {
          inset: -28px;
          border-color: rgba(245,211,107,0.06);
          animation-delay: calc(var(--delay) + 1.1s);
        }

        .craft-background__particles span {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(230,233,242,0.52);
          box-shadow: 0 0 10px rgba(103,232,249,0.18);
          opacity: 0.32;
          animation: particleDrift var(--dur) linear infinite;
          animation-delay: var(--delay);
        }

        .craft-screen::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(rgba(245,211,107,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(103,232,249,0.035) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at center, black, transparent 76%);
          opacity: 0.5;
        }

        .craft-screen::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          display: grid;
          place-items: center;
          color: rgba(245,211,107,0.045);
          font-size: clamp(52px, 9vw, 126px);
          letter-spacing: 0;
          transform: rotate(-10deg);
          pointer-events: none;
          text-shadow: 0 0 48px rgba(245,211,107,0.08);
        }

        .alchemy-panel {
          position: relative;
          background:
            radial-gradient(circle at 50% 0%, rgba(245,211,107,0.08), transparent 24rem),
            linear-gradient(180deg, rgba(12,17,27,0.86), rgba(8,12,20,0.76));
          border: 1px solid rgba(245,211,107,0.13);
          box-shadow: 0 24px 80px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .fusion-chamber {
          position: relative;
          background:
            radial-gradient(circle at 50% 35%, rgba(245,211,107,0.12), transparent 18rem),
            linear-gradient(180deg, rgba(8,12,20,0.82), rgba(17,24,39,0.58));
        }

        .fusion-chamber::before {
          content: "";
          position: absolute;
          inset: 18px;
          border: 1px solid rgba(245,211,107,0.07);
          border-radius: 18px;
          pointer-events: none;
        }

        .fusion-slots {
          position: relative;
          z-index: 1;
        }

        .fusion-slot {
          position: relative;
          overflow: hidden;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, background 160ms ease;
        }

        .fusion-slot::after {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 12px;
          pointer-events: none;
        }

        .fusion-slot:hover {
          transform: translateY(-1px);
          border-color: rgba(245,211,107,0.4) !important;
        }

        .fusion-core {
          position: relative;
          min-width: 104px;
          display: grid;
          place-items: center;
        }

        .fusion-core::before,
        .fusion-core::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 54px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,211,107,0.42), transparent);
          opacity: 0.65;
        }

        .fusion-core::before { right: 68px; }
        .fusion-core::after { left: 68px; }

        .fusion-orb {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: rgba(245,211,107,0.86);
          background:
            radial-gradient(circle, rgba(245,211,107,0.18), rgba(245,211,107,0.035) 58%, transparent 60%),
            rgba(255,255,255,0.025);
          border: 1px solid rgba(245,211,107,0.28);
          box-shadow: 0 0 34px rgba(245,211,107,0.16);
          font-size: 24px;
        }

        .fusion-chamber.is-fusing .fusion-orb {
          animation: calibrationPulse 1.2s ease-in-out both;
        }

        .fusion-chamber.is-fusing .fusion-core::before,
        .fusion-chamber.is-fusing .fusion-core::after {
          animation: ledgerConverge 1.2s ease-in-out both;
        }

        .component-card {
          position: relative;
          overflow: hidden;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .component-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 42%);
          opacity: 0;
          transition: opacity 140ms ease;
          pointer-events: none;
        }

        .component-card:hover {
          transform: translateY(-1px);
          border-color: rgba(245,211,107,0.32) !important;
          box-shadow: 0 10px 24px rgba(0,0,0,0.16);
        }

        .component-card:hover::before {
          opacity: 1;
        }

        .result-reveal {
          position: relative;
          overflow: hidden;
        }

        .result-reveal::after {
          content: "";
          position: absolute;
          inset: auto 18px 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,211,107,0.55), transparent);
          opacity: 0.8;
        }

        @keyframes backgroundParallaxFar {
          0% { transform: translate3d(-1.5%, -0.5%, 0); }
          50% { transform: translate3d(1%, 0.75%, 0); }
          100% { transform: translate3d(-1.5%, -0.5%, 0); }
        }

        @keyframes backgroundParallaxMid {
          0% { transform: translate3d(0.8%, 0, 0); }
          50% { transform: translate3d(-1.2%, 1%, 0); }
          100% { transform: translate3d(0.8%, 0, 0); }
        }

        @keyframes backgroundParallaxNear {
          0% { transform: translate3d(0, 0.8%, 0); }
          50% { transform: translate3d(-0.9%, -0.6%, 0); }
          100% { transform: translate3d(0, 0.8%, 0); }
        }

        @keyframes traceDrift {
          0% { opacity: 0.08; transform: translate3d(0, 0, 0) rotate(var(--angle)); }
          25% { opacity: 0.28; }
          50% { opacity: 0.16; transform: translate3d(1.8vw, -0.8vh, 0) rotate(var(--angle)); }
          75% { opacity: 0.30; }
          100% { opacity: 0.08; transform: translate3d(0, 0, 0) rotate(var(--angle)); }
        }

        @keyframes nodePulse {
          0%, 100% { transform: scale(0.88); opacity: 0.34; }
          48% { transform: scale(1.12); opacity: 0.82; }
        }

        @keyframes nodeRipple {
          0% { opacity: 0; transform: scale(0.75); }
          35% { opacity: 0.24; }
          100% { opacity: 0; transform: scale(1.4); }
        }

        @keyframes particleDrift {
          0% { transform: translate3d(0, 0, 0); opacity: 0.14; }
          40% { opacity: 0.44; }
          100% { transform: translate3d(2vw, -3vh, 0); opacity: 0.12; }
        }

        @keyframes calibrationPulse {
          0% { transform: scale(1); box-shadow: 0 0 24px rgba(245,211,107,0.14); }
          45% { transform: scale(1.12); box-shadow: 0 0 56px rgba(245,211,107,0.34); }
          100% { transform: scale(1); box-shadow: 0 0 34px rgba(245,211,107,0.18); }
        }

        @keyframes ledgerConverge {
          0% { opacity: 0.25; transform: scaleX(0.72); }
          50% { opacity: 1; transform: scaleX(1.18); }
          100% { opacity: 0.55; transform: scaleX(1); }
        }

        @media (max-width: 640px) {
          .fusion-slots { grid-template-columns: 1fr !important; }
          .fusion-core { min-height: 78px; }
          .fusion-core::before,
          .fusion-core::after {
            left: 50%;
            right: auto;
            width: 1px;
            height: 30px;
            background: linear-gradient(180deg, transparent, rgba(245,211,107,0.42), transparent);
          }
          .fusion-core::before { top: -12px; }
          .fusion-core::after { top: auto; bottom: -12px; }
          .item-ledger { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .fusion-action { width: 100% !important; }
        }

        .craft-screen {
          padding: 24px 16px 36px;
          background:
            radial-gradient(circle at 50% 12%, rgba(245,211,107,0.24), transparent 15rem),
            radial-gradient(circle at 14% 12%, rgba(117,89,43,0.42), transparent 26rem),
            radial-gradient(circle at 86% 18%, rgba(74,94,112,0.30), transparent 25rem),
            radial-gradient(circle at 48% 96%, rgba(76,42,96,0.38), transparent 31rem),
            linear-gradient(180deg, #03050a 0%, #080b13 42%, #04050a 100%);
        }

        .craft-screen::before {
          background:
            linear-gradient(rgba(245,211,107,0.085) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,211,107,0.052) 1px, transparent 1px),
            repeating-linear-gradient(0deg, transparent 0 17px, rgba(255,255,255,0.028) 18px 19px);
          background-size: 46px 46px, 46px 46px, 100% 19px;
          mask-image: radial-gradient(circle at center, black 0 48%, transparent 84%);
          opacity: 0.78;
        }

        .craft-screen::after {
          content: "";
          width: min(90vw, 800px);
          aspect-ratio: 1;
          inset: auto;
          left: 50%;
          top: 54%;
          transform: translate(-50%, -50%);
          display: block;
          border-radius: 999px;
          background:
            radial-gradient(circle, transparent 0 30%, rgba(245,211,107,0.10) 30.2% 30.6%, transparent 31% 45%, rgba(245,211,107,0.075) 45.2% 45.8%, transparent 46% 60%, rgba(103,232,249,0.055) 60.2% 60.8%, transparent 61%),
            conic-gradient(from 24deg, transparent 0 12deg, rgba(245,211,107,0.07) 12deg 14deg, transparent 14deg 42deg, rgba(103,232,249,0.05) 42deg 44deg, transparent 44deg 90deg);
          opacity: 0.95;
        }

        .alchemy-panel {
          background:
            radial-gradient(circle at 50% 0%, rgba(245,211,107,0.18), transparent 27rem),
            radial-gradient(circle at 8% 100%, rgba(103,232,249,0.08), transparent 18rem),
            linear-gradient(180deg, rgba(10,14,23,0.96), rgba(5,7,13,0.92));
          border: 1px solid rgba(245,211,107,0.28);
          box-shadow: 0 34px 120px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .alchemy-panel::before {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(245,211,107,0.08);
          border-radius: 18px;
          pointer-events: none;
        }

        .fusion-chamber {
          background:
            radial-gradient(circle at 50% 43%, rgba(245,211,107,0.24), transparent 12rem),
            radial-gradient(circle at 18% 28%, rgba(245,211,107,0.14), transparent 13rem),
            radial-gradient(circle at 82% 28%, rgba(103,232,249,0.11), transparent 13rem),
            linear-gradient(180deg, rgba(7,9,16,0.98), rgba(13,10,18,0.92));
        }

        .fusion-chamber::before {
          inset: 16px;
          border: 1px solid rgba(245,211,107,0.14);
          border-radius: 22px;
          box-shadow: inset 0 0 56px rgba(245,211,107,0.06);
        }

        .fusion-chamber::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at center, transparent 0 21%, rgba(245,211,107,0.075) 21.5% 22%, transparent 22.5% 100%);
          pointer-events: none;
        }

        .fusion-slot {
          clip-path: polygon(7% 0, 93% 0, 100% 12%, 100% 88%, 93% 100%, 7% 100%, 0 88%, 0 12%);
        }

        .fusion-slot::before {
          content: "";
          position: absolute;
          inset: -60%;
          background: conic-gradient(from 0deg, transparent, rgba(245,211,107,0.10), transparent, rgba(103,232,249,0.05), transparent);
          opacity: 0.6;
          pointer-events: none;
        }

        .fusion-slot::after {
          inset: 18px;
          border: 1px solid rgba(245,211,107,0.16);
          border-radius: 999px;
          box-shadow: inset 0 0 36px rgba(245,211,107,0.05);
        }

        .fusion-slot:hover {
          transform: translateY(-2px);
          border-color: rgba(245,211,107,0.58) !important;
        }

        .fusion-core {
          min-width: 140px;
        }

        .fusion-core::before,
        .fusion-core::after {
          width: 92px;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(245,211,107,0.86), rgba(103,232,249,0.42), transparent);
          opacity: 0.92;
          box-shadow: 0 0 24px rgba(245,211,107,0.36);
        }

        .fusion-core::before { right: 86px; }
        .fusion-core::after { left: 86px; }

        .fusion-orb {
          width: 96px;
          height: 96px;
          color: rgba(245,211,107,0.98);
          background:
            radial-gradient(circle, rgba(245,211,107,0.42) 0 12%, rgba(245,211,107,0.12) 13% 34%, transparent 36%),
            radial-gradient(circle, transparent 0 54%, rgba(103,232,249,0.18) 55% 57%, transparent 58%),
            rgba(255,255,255,0.025);
          border: 1px solid rgba(245,211,107,0.58);
          box-shadow: 0 0 56px rgba(245,211,107,0.30), inset 0 0 24px rgba(245,211,107,0.12);
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .component-card {
          clip-path: polygon(8% 0, 100% 0, 100% 86%, 92% 100%, 0 100%, 0 14%);
        }

        .component-card:hover {
          transform: translateY(-3px);
          border-color: rgba(245,211,107,0.55) !important;
          box-shadow: 0 16px 34px rgba(0,0,0,0.34), 0 0 22px rgba(245,211,107,0.11);
        }

        .result-reveal {
          clip-path: polygon(4% 0, 96% 0, 100% 12%, 100% 88%, 96% 100%, 4% 100%, 0 88%, 0 12%);
        }

        .result-reveal::before {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(245,211,107,0.12);
          border-radius: 18px;
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .fusion-core { min-height: 104px; }
          .fusion-core::before,
          .fusion-core::after {
            left: 50%;
            right: auto;
            width: 3px;
            height: 48px;
            background: linear-gradient(180deg, transparent, rgba(245,211,107,0.62), transparent);
          }
          .fusion-core::before { top: -20px; }
          .fusion-core::after { top: auto; bottom: -20px; }

          .fusion-chamber.is-calibrating .fusion-slot.is-left.is-acknowledged {
            animation: inputDriftDown 520ms ease-out both;
          }

          .fusion-chamber.is-calibrating .fusion-slot.is-right.is-acknowledged {
            animation: inputDriftUp 520ms ease-out both;
          }

          .fusion-chamber.is-accelerating .fusion-slot.is-left.is-acknowledged {
            animation: inputConvergeDown 780ms cubic-bezier(.2,.72,.22,1) both;
          }

          .fusion-chamber.is-accelerating .fusion-slot.is-right.is-acknowledged {
            animation: inputConvergeUp 780ms cubic-bezier(.2,.72,.22,1) both;
          }
        }

        .fusion-chamber {
          background:
            radial-gradient(circle at 50% 48%, rgba(218,184,104,0.16), transparent 11rem),
            linear-gradient(180deg, rgba(15,13,10,0.98), rgba(6,8,13,0.96));
          border-color: rgba(218,184,104,0.30) !important;
        }

        .fusion-chamber::before {
          inset: 14px;
          border: 1px solid rgba(218,184,104,0.18);
          border-radius: 24px;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.24), inset 0 0 44px rgba(218,184,104,0.045);
        }

        .fusion-chamber::after {
          background:
            radial-gradient(circle at center, transparent 0 23%, rgba(218,184,104,0.08) 23.4% 23.8%, transparent 24.2% 100%),
            linear-gradient(90deg, transparent 0 45%, rgba(218,184,104,0.12) 49%, rgba(218,184,104,0.12) 51%, transparent 55% 100%);
        }

        .fusion-slot {
          clip-path: polygon(10% 0, 90% 0, 100% 14%, 100% 86%, 90% 100%, 10% 100%, 0 86%, 0 14%);
        }

        .fusion-slot::before {
          background:
            radial-gradient(circle at center, transparent 0 38%, rgba(218,184,104,0.13) 39% 40%, transparent 41%),
            linear-gradient(135deg, rgba(238,220,172,0.08), transparent 44%);
          opacity: 1;
          inset: 0;
        }

        .fusion-slot::after {
          inset: 20px;
          border: 1px solid rgba(218,184,104,0.20);
          border-radius: 999px;
          box-shadow: inset 0 0 30px rgba(218,184,104,0.045);
        }

        .fusion-core::before,
        .fusion-core::after {
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(218,184,104,0.76), rgba(230,222,202,0.28), transparent);
          box-shadow: 0 0 18px rgba(218,184,104,0.20);
        }

        .fusion-orb {
          background:
            radial-gradient(circle, rgba(218,184,104,0.24) 0 15%, transparent 16% 42%, rgba(218,184,104,0.12) 43% 45%, transparent 46%),
            linear-gradient(180deg, rgba(28,22,14,0.92), rgba(7,8,11,0.92));
          border-color: rgba(218,184,104,0.50);
          box-shadow: 0 0 32px rgba(218,184,104,0.16), inset 0 0 24px rgba(0,0,0,0.30);
          color: #e6c66f;
        }

        .fusion-action {
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .fusion-orb {
          position: relative;
          overflow: hidden;
          transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease, filter 180ms ease;
        }

        .fusion-orb::before,
        .fusion-orb::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          pointer-events: none;
        }

        .fusion-chamber.is-anticipating .fusion-slot.is-acknowledged {
          border-color: rgba(191,157,92,0.50) !important;
          box-shadow: 0 0 18px rgba(191,157,92,0.08), inset 0 0 0 1px rgba(191,157,92,0.08) !important;
        }

        .fusion-chamber.is-calibrating .fusion-slot.is-left.is-acknowledged {
          animation: inputDriftLeft 520ms ease-out both;
        }

        .fusion-chamber.is-calibrating .fusion-slot.is-right.is-acknowledged {
          animation: inputDriftRight 520ms ease-out both;
        }

        .fusion-chamber.is-accelerating .fusion-slot.is-left.is-acknowledged {
          animation: inputConvergeLeft 780ms cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-accelerating .fusion-slot.is-right.is-acknowledged {
          animation: inputConvergeRight 780ms cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-locking .fusion-slot.is-acknowledged {
          animation: inputCompress 1100ms cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-calibrating {
          background:
            radial-gradient(circle at 50% 48%, rgba(191,157,92,0.08), transparent 11rem),
            linear-gradient(180deg, rgba(10,10,10,0.99), rgba(5,6,8,0.97));
        }

        .fusion-chamber.is-calibrating .fusion-slot.is-acknowledged::before {
          animation: inputScan 520ms linear both;
          background:
            linear-gradient(180deg, transparent 0 36%, rgba(226,218,197,0.10) 47%, rgba(191,157,92,0.16) 50%, rgba(226,218,197,0.10) 53%, transparent 64%),
            radial-gradient(circle at center, transparent 0 38%, rgba(191,157,92,0.08) 39% 40%, transparent 41%);
          opacity: 0.7;
        }

        .fusion-chamber.is-calibrating .fusion-orb::before {
          animation: alignmentTick 520ms ease-in-out both;
          background:
            conic-gradient(from 0deg, rgba(226,218,197,0.36) 0 2deg, transparent 2deg 28deg, rgba(191,157,92,0.28) 28deg 30deg, transparent 30deg 88deg, rgba(226,218,197,0.30) 88deg 90deg, transparent 90deg 180deg, rgba(191,157,92,0.24) 180deg 182deg, transparent 182deg 268deg, rgba(226,218,197,0.30) 268deg 270deg, transparent 270deg 360deg),
            radial-gradient(circle, transparent 0 54%, rgba(191,157,92,0.16) 55% 56%, transparent 57%);
        }

        .fusion-chamber.is-accelerating .fusion-core::before {
          animation: energyTraceLeft 780ms cubic-bezier(.2,.72,.22,1) both;
          transform-origin: right center;
        }

        .fusion-chamber.is-accelerating .fusion-core::after {
          animation: energyTraceRight 780ms cubic-bezier(.2,.72,.22,1) both;
          transform-origin: left center;
        }

        .fusion-chamber.is-accelerating .fusion-orb {
          animation: coreConcentrate 780ms cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-accelerating .fusion-core {
          z-index: 3;
        }

        .fusion-chamber.is-locking {
          background:
            radial-gradient(circle at 50% 48%, rgba(191,157,92,0.06), transparent 9rem),
            linear-gradient(180deg, rgba(5,5,6,0.99), rgba(3,4,6,0.98));
        }

        .fusion-chamber.is-locking .fusion-core {
          z-index: 4;
        }

        .fusion-chamber.is-locking .fusion-core::before,
        .fusion-chamber.is-locking .fusion-core::after {
          opacity: 0.46;
          transform: scaleX(0.58);
          transition: opacity 120ms ease, transform 120ms ease;
        }

        .fusion-chamber.is-locking .fusion-orb {
          animation: signalLock 1100ms cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-locking .fusion-orb::after {
          animation: signalTrace 1100ms linear both;
          background:
            linear-gradient(90deg, transparent 0 14%, rgba(226,218,197,0.0) 14% 23%, rgba(226,218,197,0.62) 24% 25%, transparent 26% 36%, rgba(191,157,92,0.55) 37% 39%, transparent 40% 52%, rgba(226,218,197,0.72) 53% 54%, transparent 55% 66%, rgba(191,157,92,0.48) 67% 70%, transparent 71% 100%),
            linear-gradient(180deg, transparent 0 46%, rgba(226,218,197,0.22) 48%, rgba(191,157,92,0.34) 50%, rgba(226,218,197,0.22) 52%, transparent 54%);
        }

        .fusion-core-result {
          width: min(320px, 82vw);
          min-height: 300px;
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 9px;
          padding: 24px 22px;
          position: relative;
          z-index: 2;
          overflow: hidden;
          text-align: center;
          color: #f3ead7;
          background:
            radial-gradient(circle at 50% 34%, rgba(191,157,92,0.16), transparent 58%),
            linear-gradient(180deg, rgba(18,16,12,0.98), rgba(5,6,8,0.98));
          border: 1px solid rgba(191,157,92,0.42);
          border-radius: 22px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.42), 0 0 34px rgba(191,157,92,0.14), inset 0 0 0 1px rgba(255,255,255,0.05);
          transform-origin: center;
          animation: resultHeroReveal var(--fusion-reveal-ms, 280ms) cubic-bezier(.16,1,.3,1) both;
        }

        .fusion-core-result::before {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(191,157,92,0.15);
          border-radius: 16px;
          pointer-events: none;
        }

        .fusion-core-result::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(226,218,197,0.16), transparent);
          opacity: 0;
          transform: translateX(-58%);
          animation: coreRevealSweep 1100ms ease-out both;
          pointer-events: none;
        }

        .rarity-motion-field {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .rarity-motion-field i {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          opacity: 0;
          background: rgba(226,218,197,0.86);
          box-shadow: 0 0 14px rgba(226,218,197,0.44);
        }

        .fusion-core-result > :not(.rarity-motion-field) {
          position: relative;
          z-index: 1;
        }

        .fusion-core-result.is-common {
          animation-duration: 1200ms;
        }

        .fusion-core-result.is-common::after {
          animation: commonShimmer var(--fusion-reveal-ms, 280ms) ease-out both;
        }

        .fusion-core-result.is-rare {
          box-shadow: 0 28px 80px rgba(0,0,0,0.46), 0 0 46px rgba(216,191,130,0.28), inset 0 0 0 1px rgba(255,255,255,0.05);
          animation-duration: var(--fusion-reveal-ms, 340ms);
        }

        .fusion-core-result.is-rare::before {
          border-color: rgba(216,191,130,0.36);
          animation: rareRingSweep var(--fusion-reveal-ms, 340ms) ease-out both;
        }

        .fusion-core-result.is-epic {
          background:
            radial-gradient(circle at 50% 34%, rgba(184,115,255,0.18), transparent 58%),
            radial-gradient(circle at 22% 12%, rgba(216,191,130,0.14), transparent 32%),
            linear-gradient(180deg, rgba(18,14,24,0.98), rgba(5,6,8,0.98));
          border-color: rgba(184,115,255,0.34);
          box-shadow: 0 30px 88px rgba(0,0,0,0.52), 0 0 50px rgba(184,115,255,0.18), 0 0 34px rgba(216,191,130,0.16), inset 0 0 0 1px rgba(255,255,255,0.05);
          animation: resultHeroReveal var(--fusion-reveal-ms, 420ms) cubic-bezier(.16,1,.3,1) both, epicPulse var(--fusion-reveal-ms, 420ms) ease-out both;
        }

        .fusion-core-result.is-epic .rarity-motion-field i {
          background: rgba(184,115,255,0.88);
          animation: epicParticleBurst var(--fusion-reveal-ms, 420ms) ease-out both;
        }

        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(2) { animation-delay: 60ms; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(3) { animation-delay: 110ms; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(4) { animation-delay: 160ms; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(5) { animation-delay: 210ms; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(6) { animation-delay: 260ms; }

        .fusion-core-result.is-legendary {
          background:
            linear-gradient(115deg, transparent 0 20%, rgba(216,191,130,0.18) 20.5% 21%, transparent 21.5% 44%, rgba(226,218,197,0.14) 44.5% 45%, transparent 45.5%),
            radial-gradient(circle at 50% 34%, rgba(216,191,130,0.26), transparent 62%),
            linear-gradient(180deg, rgba(24,18,8,0.99), rgba(4,4,6,0.99));
          border-color: rgba(216,191,130,0.58);
          box-shadow: 0 34px 100px rgba(0,0,0,0.62), 0 0 74px rgba(216,191,130,0.34), inset 0 0 0 1px rgba(255,255,255,0.08);
          animation: legendaryHeroReveal var(--fusion-reveal-ms, 540ms) cubic-bezier(.16,1,.3,1) both;
        }

        .fusion-core-result.is-legendary .rarity-motion-field {
          background:
            linear-gradient(48deg, transparent 0 46%, rgba(216,191,130,0.34) 46.4% 46.9%, transparent 47.3%),
            linear-gradient(128deg, transparent 0 38%, rgba(226,218,197,0.26) 38.4% 38.9%, transparent 39.3%),
            radial-gradient(circle at 50% 50%, rgba(216,191,130,0.18), transparent 52%);
          animation: legendaryConstellation var(--fusion-reveal-ms, 540ms) ease-out both;
        }

        .fusion-core-result.is-legendary .rarity-motion-field i {
          background: rgba(216,191,130,0.95);
          animation: legendaryStarBurst var(--fusion-reveal-ms, 540ms) ease-out both;
        }

        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(2) { animation-delay: 70ms; }
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(3) { animation-delay: 120ms; }
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(4) { animation-delay: 170ms; }
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(5) { animation-delay: 220ms; }
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(6) { animation-delay: 270ms; }

        .fusion-core-result__index {
          color: rgba(230,222,202,0.58);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fusion-core-result__plate {
          width: 104px;
          height: 104px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          position: relative;
          background:
            radial-gradient(circle, rgba(191,157,92,0.16) 0 24%, transparent 25% 46%, rgba(191,157,92,0.10) 47% 49%, transparent 50%),
            linear-gradient(180deg, rgba(22,18,13,0.94), rgba(8,8,9,0.94));
          border: 1px solid rgba(191,157,92,0.46);
          box-shadow: inset 0 0 22px rgba(0,0,0,0.34), 0 0 20px rgba(191,157,92,0.12);
        }

        .fusion-core-result__icon {
          font-size: 52px;
          line-height: 1;
          filter: sepia(0.16) saturate(0.9);
        }

        .fusion-core-result__meta {
          color: rgba(230,222,202,0.58);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .fusion-core-result__name {
          max-width: 100%;
          color: #f3ead7;
          font-size: 28px;
          font-weight: 950;
          line-height: 1.05;
          word-break: break-word;
          animation: resultNameResolve 900ms 150ms cubic-bezier(.16,1,.3,1) both;
        }

        .fusion-core-result__rarity {
          font-size: 14px;
          font-weight: 950;
          text-transform: uppercase;
          animation: resultDetailResolve 900ms 300ms cubic-bezier(.16,1,.3,1) both;
        }

        .fusion-core-result__tier {
          color: rgba(243,234,215,0.80);
          font-size: 13px;
          font-weight: 950;
          text-transform: uppercase;
          animation: resultDetailResolve 900ms 300ms cubic-bezier(.16,1,.3,1) both;
        }

        .fusion-core-result__found {
          margin-top: 2px;
          color: rgba(230,222,202,0.48);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          animation: resultDetailResolve 900ms 360ms cubic-bezier(.16,1,.3,1) both;
        }

        @keyframes inputDriftLeft {
          0% { transform: translateX(0); filter: brightness(1); }
          100% { transform: translateX(12px); filter: brightness(0.94); }
        }

        @keyframes inputDriftRight {
          0% { transform: translateX(0); filter: brightness(1); }
          100% { transform: translateX(-12px); filter: brightness(0.94); }
        }

        @keyframes inputConvergeLeft {
          0% { transform: translateX(12px); filter: brightness(0.94); }
          72% { transform: translateX(38px); filter: brightness(0.88); }
          100% { transform: translateX(34px) scale(0.985); filter: brightness(0.78); }
        }

        @keyframes inputConvergeRight {
          0% { transform: translateX(-12px); filter: brightness(0.94); }
          72% { transform: translateX(-38px); filter: brightness(0.88); }
          100% { transform: translateX(-34px) scale(0.985); filter: brightness(0.78); }
        }

        @keyframes inputCompress {
          0% { opacity: 1; transform: translateX(0) scale(0.985); filter: brightness(0.78); }
          52% { opacity: 0.72; transform: translateX(0) scale(0.955); filter: brightness(0.54) contrast(1.12); }
          100% { opacity: 0.34; transform: translateX(0) scale(0.92); filter: brightness(0.38) contrast(1.18); }
        }

        @keyframes inputDriftDown {
          0% { transform: translateY(0); filter: brightness(1); }
          100% { transform: translateY(10px); filter: brightness(0.94); }
        }

        @keyframes inputDriftUp {
          0% { transform: translateY(0); filter: brightness(1); }
          100% { transform: translateY(-10px); filter: brightness(0.94); }
        }

        @keyframes inputConvergeDown {
          0% { transform: translateY(10px); filter: brightness(0.94); }
          72% { transform: translateY(28px); filter: brightness(0.88); }
          100% { transform: translateY(24px) scale(0.985); filter: brightness(0.78); }
        }

        @keyframes inputConvergeUp {
          0% { transform: translateY(-10px); filter: brightness(0.94); }
          72% { transform: translateY(-28px); filter: brightness(0.88); }
          100% { transform: translateY(-24px) scale(0.985); filter: brightness(0.78); }
        }

        @keyframes inputScan {
          0% { transform: translateY(-46%); opacity: 0; }
          18% { opacity: 0.62; }
          82% { opacity: 0.62; }
          100% { transform: translateY(46%); opacity: 0; }
        }

        @keyframes alignmentTick {
          0% { opacity: 0; transform: rotate(-8deg) scale(0.98); filter: brightness(0.72); }
          42% { opacity: 0.72; }
          100% { opacity: 0.46; transform: rotate(0deg) scale(1); filter: brightness(0.9); }
        }

        @keyframes energyTraceLeft {
          0% { opacity: 0.18; transform: translateX(-22px) scaleX(0.18); filter: brightness(0.72); }
          72% { opacity: 0.86; transform: translateX(0) scaleX(0.92); filter: brightness(1.04); }
          100% { opacity: 0.64; transform: translateX(0) scaleX(0.72); filter: brightness(0.9); }
        }

        @keyframes energyTraceRight {
          0% { opacity: 0.18; transform: translateX(22px) scaleX(0.18); filter: brightness(0.72); }
          72% { opacity: 0.86; transform: translateX(0) scaleX(0.92); filter: brightness(1.04); }
          100% { opacity: 0.64; transform: translateX(0) scaleX(0.72); filter: brightness(0.9); }
        }

        @keyframes coreConcentrate {
          0% { transform: scale(1); box-shadow: 0 0 22px rgba(191,157,92,0.10), inset 0 0 20px rgba(0,0,0,0.32); filter: brightness(0.92); }
          68% { transform: scale(0.97); box-shadow: 0 0 34px rgba(191,157,92,0.18), inset 0 0 26px rgba(191,157,92,0.08); filter: brightness(1.05); }
          100% { transform: scale(0.95); box-shadow: 0 0 24px rgba(191,157,92,0.13), inset 0 0 30px rgba(0,0,0,0.38); filter: brightness(0.88); }
        }

        @keyframes signalLock {
          0% { transform: scale(0.95); filter: brightness(0.76) contrast(1.02); box-shadow: 0 0 16px rgba(191,157,92,0.08), inset 0 0 34px rgba(0,0,0,0.46); }
          46% { transform: scale(0.92); filter: brightness(0.62) contrast(1.18); box-shadow: 0 0 10px rgba(191,157,92,0.06), inset 0 0 42px rgba(0,0,0,0.58); }
          100% { transform: scale(0.96); filter: brightness(1.02) contrast(1.06); box-shadow: 0 0 38px rgba(191,157,92,0.20), inset 0 0 24px rgba(191,157,92,0.10); }
        }

        @keyframes signalTrace {
          0% { opacity: 0; transform: translateX(-38%) scaleX(0.46); }
          32% { opacity: 0.74; }
          70% { opacity: 0.92; transform: translateX(12%) scaleX(0.78); }
          100% { opacity: 0; transform: translateX(38%) scaleX(0.62); }
        }

        @keyframes resultHeroReveal {
          0% { opacity: 0; transform: scale(1); filter: blur(12px) brightness(0.52); }
          58% { opacity: 1; transform: scale(1.28); filter: blur(2px) brightness(1.14); }
          100% { opacity: 1; transform: scale(1.06); filter: blur(0) brightness(1); }
        }

        @keyframes resultNameResolve {
          0% { opacity: 0; transform: translateY(8px); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes resultDetailResolve {
          0% { opacity: 0; transform: translateY(6px); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes commonShimmer {
          0% { opacity: 0; transform: translateX(-64%); }
          42% { opacity: 0.36; }
          100% { opacity: 0; transform: translateX(64%); }
        }

        @keyframes rareRingSweep {
          0% { opacity: 0; transform: rotate(-18deg) scale(0.86); box-shadow: inset 0 0 0 rgba(216,191,130,0); }
          45% { opacity: 1; transform: rotate(10deg) scale(1.04); box-shadow: inset 0 0 34px rgba(216,191,130,0.10), 0 0 28px rgba(216,191,130,0.20); }
          100% { opacity: 0.55; transform: rotate(0deg) scale(1); box-shadow: inset 0 0 20px rgba(216,191,130,0.06); }
        }

        @keyframes epicPulse {
          0% { box-shadow: 0 26px 80px rgba(0,0,0,0.48), 0 0 0 rgba(184,115,255,0); }
          44% { box-shadow: 0 32px 92px rgba(0,0,0,0.56), 0 0 64px rgba(184,115,255,0.24), 0 0 42px rgba(216,191,130,0.18); }
          100% { box-shadow: 0 30px 88px rgba(0,0,0,0.52), 0 0 50px rgba(184,115,255,0.18), 0 0 34px rgba(216,191,130,0.16); }
        }

        @keyframes epicParticleBurst {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          35% { opacity: 0.9; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--x, 56px)), calc(-50% + var(--y, -44px))) scale(1); }
        }

        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(1),
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(1) { --x: -74px; --y: -54px; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(2),
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(2) { --x: 80px; --y: -48px; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(3),
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(3) { --x: -90px; --y: 30px; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(4),
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(4) { --x: 92px; --y: 36px; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(5),
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(5) { --x: -28px; --y: 80px; }
        .fusion-core-result.is-epic .rarity-motion-field i:nth-child(6),
        .fusion-core-result.is-legendary .rarity-motion-field i:nth-child(6) { --x: 34px; --y: 84px; }

        @keyframes legendaryHeroReveal {
          0% { opacity: 0; transform: scale(1); filter: blur(12px) brightness(0.38); }
          32% { opacity: 1; transform: scale(1.34); filter: blur(4px) brightness(1.35); }
          66% { opacity: 1; transform: scale(1.14); filter: blur(0) brightness(1.08); }
          100% { opacity: 1; transform: scale(1.08); filter: blur(0) brightness(1); }
        }

        @keyframes legendaryConstellation {
          0% { opacity: 0; transform: scale(0.72) rotate(-8deg); }
          32% { opacity: 1; transform: scale(1.06) rotate(2deg); }
          100% { opacity: 0.58; transform: scale(1) rotate(0); }
        }

        @keyframes legendaryStarBurst {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          28% { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--x, 100px)), calc(-50% + var(--y, -72px))) scale(1.25); }
        }

        @keyframes coreRevealSweep {
          0% { opacity: 0; transform: translateX(-58%); }
          34% { opacity: 0.42; }
          100% { opacity: 0; transform: translateX(58%); }
        }

        @keyframes coreRingDrift {
          0% { transform: rotate(0deg) scale(1); opacity: 0.72; }
          50% { transform: rotate(180deg) scale(1.02); opacity: 0.92; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.72; }
        }

        @keyframes coreRingDriftReverse {
          0% { transform: rotate(360deg) scale(1); opacity: 0.56; }
          50% { transform: rotate(180deg) scale(0.98); opacity: 0.82; }
          100% { transform: rotate(0deg) scale(1); opacity: 0.56; }
        }

        @keyframes corePulseBreath {
          0%, 100% { transform: scale(0.92); opacity: 0.68; }
          48% { transform: scale(1.08); opacity: 0.96; }
        }

        @keyframes coreStreamLeft {
          0%, 100% { transform: scaleX(0.28); opacity: 0.12; }
          52% { transform: scaleX(1); opacity: 0.28; }
        }

        @keyframes coreStreamRight {
          0%, 100% { transform: scaleX(0.24); opacity: 0.10; }
          52% { transform: scaleX(1); opacity: 0.26; }
        }

        @keyframes tokenTraverseLeft {
          0% { opacity: 0; transform: translate3d(0, -50%, 0) translateX(0) scale(0.82); filter: brightness(0.88); }
          18% { opacity: 0.94; }
          68% { opacity: 1; transform: translate3d(50%, -50%, 0) translateX(48px) scale(0.96); filter: brightness(1.08); }
          100% { opacity: 0; transform: translate3d(108%, -50%, 0) translateX(0) scale(0.72); filter: brightness(1.18) blur(1px); }
        }

        @keyframes tokenTraverseRight {
          0% { opacity: 0; transform: translate3d(0, -50%, 0) translateX(0) scale(0.82); filter: brightness(0.88); }
          18% { opacity: 0.94; }
          68% { opacity: 1; transform: translate3d(-50%, -50%, 0) translateX(-48px) scale(0.96); filter: brightness(1.08); }
          100% { opacity: 0; transform: translate3d(-108%, -50%, 0) translateX(0) scale(0.72); filter: brightness(1.18) blur(1px); }
        }

        @media (max-width: 640px) {
          .fusion-chamber.is-calibrating .fusion-slot.is-left.is-acknowledged {
            animation: inputDriftDown 900ms ease-out both;
          }

          .fusion-chamber.is-calibrating .fusion-slot.is-right.is-acknowledged {
            animation: inputDriftUp 900ms ease-out both;
          }

          .fusion-chamber.is-accelerating .fusion-slot.is-left.is-acknowledged {
            animation: inputConvergeDown 900ms cubic-bezier(.2,.72,.22,1) both;
          }

          .fusion-chamber.is-accelerating .fusion-slot.is-right.is-acknowledged {
            animation: inputConvergeUp 900ms cubic-bezier(.2,.72,.22,1) both;
          }

          .fusion-core-stage__shell {
            min-height: 240px;
          }

          .fusion-core-stage__core {
            width: min(100%, 320px);
            min-height: 200px;
          }

          .fusion-core-stage__token {
            width: min(48vw, 150px);
            padding: 9px 10px;
          }

          .fusion-core-stage__result {
            width: min(100%, 310px);
          }
        }

        .craft-screen {
          background:
            radial-gradient(circle at 50% 10%, rgba(191,157,92,0.15), transparent 18rem),
            radial-gradient(circle at 18% 28%, rgba(81,70,55,0.20), transparent 26rem),
            linear-gradient(180deg, #05070b 0%, #090b10 48%, #050608 100%);
        }

        .craft-screen::before {
          background:
            linear-gradient(rgba(202,180,132,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(202,180,132,0.032) 1px, transparent 1px),
            repeating-linear-gradient(0deg, transparent 0 20px, rgba(255,255,255,0.018) 21px 22px);
          opacity: 0.46;
        }

        .craft-screen::after {
          opacity: 0.34;
        }

        .alchemy-panel {
          background:
            radial-gradient(circle at 50% 0%, rgba(191,157,92,0.10), transparent 25rem),
            linear-gradient(180deg, rgba(13,14,16,0.96), rgba(7,8,10,0.93));
          border-color: rgba(191,157,92,0.22);
          box-shadow: 0 30px 90px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.055);
        }

        .fusion-chamber {
          background:
            radial-gradient(circle at 50% 48%, rgba(191,157,92,0.10), transparent 12rem),
            linear-gradient(180deg, rgba(14,13,11,0.98), rgba(7,8,10,0.96));
          border-color: rgba(191,157,92,0.24) !important;
        }

        .fusion-chamber::before {
          border-color: rgba(191,157,92,0.14);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.26), inset 0 0 34px rgba(191,157,92,0.035);
        }

        .fusion-chamber::after {
          background:
            radial-gradient(circle at center, transparent 0 23%, rgba(191,157,92,0.055) 23.4% 23.8%, transparent 24.2% 100%),
            linear-gradient(90deg, transparent 0 46%, rgba(191,157,92,0.075) 49%, rgba(191,157,92,0.075) 51%, transparent 54% 100%);
        }

        .fusion-slot:hover {
          border-color: rgba(191,157,92,0.42) !important;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.18);
        }

        .fusion-slot::before {
          background:
            radial-gradient(circle at center, transparent 0 38%, rgba(191,157,92,0.08) 39% 40%, transparent 41%),
            linear-gradient(135deg, rgba(225,210,176,0.045), transparent 44%);
        }

        .fusion-slot::after {
          border-color: rgba(191,157,92,0.15);
        }

        .fusion-orb {
          color: #d8bf82;
          border-color: rgba(191,157,92,0.38);
          background:
            radial-gradient(circle, rgba(191,157,92,0.16) 0 15%, transparent 16% 42%, rgba(191,157,92,0.08) 43% 45%, transparent 46%),
            linear-gradient(180deg, rgba(22,18,13,0.92), rgba(8,8,9,0.92));
          box-shadow: 0 0 22px rgba(191,157,92,0.10), inset 0 0 20px rgba(0,0,0,0.32);
        }

        .fusion-core-idle {
          display: grid;
          justify-items: center;
          gap: 10px;
          width: min(100%, 220px);
          position: relative;
          z-index: 2;
        }

        .fusion-slot-card__content {
          position: relative;
          z-index: 1;
        }

        .fusion-core-status {
          width: 100%;
          min-height: 30px;
          color: rgba(230,222,202,0.70);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.25;
          text-align: center;
          text-transform: uppercase;
        }

        .fusion-core-stage {
          width: 100%;
          display: grid;
          justify-items: center;
          gap: 12px;
        }

        .fusion-core-stage__shell {
          position: relative;
          width: 100%;
          min-height: min(68vh, 620px);
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .fusion-core-stage__surface {
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background:
            radial-gradient(circle at 50% 50%, rgba(191,157,92,0.08), transparent 18rem),
            radial-gradient(circle at 28% 22%, rgba(103,232,249,0.06), transparent 11rem),
            radial-gradient(circle at 72% 72%, rgba(245,211,107,0.05), transparent 12rem);
          opacity: 0.95;
          pointer-events: none;
        }

        .fusion-core-stage__grid {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(245,211,107,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(103,232,249,0.028) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black 0 52%, transparent 84%);
          opacity: 0.5;
        }

        .fusion-core-stage__stream {
          position: absolute;
          top: 50%;
          width: min(24vw, 180px);
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(191,157,92,0.44), rgba(103,232,249,0.34), transparent);
          opacity: 0.18;
          filter: blur(0.2px);
        }

        .fusion-core-stage__stream--left {
          left: 0;
          transform-origin: left center;
          animation: coreStreamLeft 7.2s ease-in-out infinite;
        }

        .fusion-core-stage__stream--right {
          right: 0;
          transform-origin: right center;
          animation: coreStreamRight 7.2s ease-in-out infinite;
        }

        .fusion-core-stage__node {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(245,211,107,0.72);
          box-shadow: 0 0 0 1px rgba(245,211,107,0.16), 0 0 16px rgba(245,211,107,0.22);
          opacity: 0.52;
          animation: nodePulse 6.8s ease-in-out infinite;
        }

        .fusion-core-stage__node--left { left: 10%; top: 24%; }
        .fusion-core-stage__node--right { right: 12%; bottom: 22%; animation-delay: -2.2s; }
        .fusion-core-stage__node--center { left: 50%; top: 54%; transform: translate(-50%, -50%); animation-delay: -1.1s; }

        .fusion-core-stage__core {
          position: relative;
          width: min(100%, 520px);
          min-height: 420px;
          display: grid;
          place-items: center;
          isolation: isolate;
        }

        .fusion-core-stage__ring {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(191,157,92,0.18);
          pointer-events: none;
        }

        .fusion-core-stage__ring--outer {
          width: 360px;
          height: 360px;
          background:
            radial-gradient(circle, transparent 0 63%, rgba(191,157,92,0.10) 63.5% 64%, transparent 64.5%),
            radial-gradient(circle, rgba(191,157,92,0.08), transparent 70%);
          box-shadow: 0 0 0 1px rgba(191,157,92,0.10), 0 0 64px rgba(191,157,92,0.12);
          animation: coreRingDrift 14s linear infinite;
        }

        .fusion-core-stage__ring--inner {
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(191,157,92,0.16), transparent 58%);
          box-shadow: inset 0 0 34px rgba(191,157,92,0.10);
          animation: coreRingDriftReverse 9s linear infinite;
        }

        .fusion-core-stage__pulse {
          position: absolute;
          width: 170px;
          height: 170px;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(245,211,107,0.32) 0 14%, rgba(245,211,107,0.10) 15% 32%, transparent 34%),
            radial-gradient(circle, transparent 0 56%, rgba(103,232,249,0.16) 57% 60%, transparent 61%);
          filter: blur(0.2px);
          opacity: 0.88;
          animation: corePulseBreath 4.8s ease-in-out infinite;
        }

        .fusion-core-stage__copy {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 6px;
          justify-items: center;
          text-align: center;
        }

        .fusion-core-stage__eyebrow {
          color: rgba(230,222,202,0.56);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .fusion-core-stage__status {
          color: rgba(243,234,215,0.82);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .fusion-core-stage__ingress {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .fusion-core-stage__token {
          position: absolute;
          top: 50%;
          width: min(42vw, 220px);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid rgba(191,157,92,0.22);
          background:
            radial-gradient(circle at 20% 20%, rgba(245,211,107,0.10), transparent 44%),
            rgba(6,8,11,0.92);
          box-shadow: 0 0 22px rgba(191,157,92,0.10), inset 0 1px 0 rgba(255,255,255,0.05);
          opacity: 0;
          transform: translateY(-50%) scale(0.84);
          will-change: transform, opacity, filter;
        }

        .fusion-core-stage__token.is-left {
          left: 0;
          animation: tokenTraverseLeft var(--fusion-stage-b-ms, 540ms) cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-core-stage__token.is-right {
          right: 0;
          justify-content: flex-end;
          text-align: right;
          animation: tokenTraverseRight var(--fusion-stage-b-ms, 540ms) cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-core-stage.is-locking .fusion-core-stage__token {
          animation-duration: var(--fusion-stage-c-ms, 400ms);
        }

        .fusion-core-stage__token-icon {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(191,157,92,0.20);
          font-size: 18px;
        }

        .fusion-core-stage__token-text {
          min-width: 0;
          color: rgba(243,234,215,0.88);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.1;
          text-transform: uppercase;
        }

        .fusion-core-stage__token-text small {
          display: block;
          margin-top: 3px;
          color: rgba(230,222,202,0.56);
          font-size: 9px;
          font-weight: 800;
        }

        .fusion-core-stage__result {
          position: absolute;
          inset: 50% auto auto 50%;
          transform: translate(-50%, -50%);
          width: min(100%, 520px);
          display: grid;
          place-items: center;
          z-index: 2;
        }

        .fusion-focus-triad {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          place-items: center;
          gap: 5px;
          font-size: 18px;
        }

        .fusion-focus-triad span,
        .fusion-focus-triad strong {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.24);
          border: 1px solid rgba(216,191,130,0.32);
          box-shadow: 0 0 14px rgba(191,157,92,0.12);
        }

        .fusion-focus-triad strong {
          width: 48px;
          color: #d8bf82;
          font-size: 9px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .fusion-core::before,
        .fusion-core::after {
          background: linear-gradient(90deg, transparent, rgba(191,157,92,0.56), rgba(226,218,197,0.22), transparent);
          box-shadow: 0 0 12px rgba(191,157,92,0.12);
        }

        .fusion-chamber.is-anticipating .fusion-slot.is-acknowledged {
          border-color: rgba(191,157,92,0.52) !important;
          box-shadow: 0 0 18px rgba(191,157,92,0.08), inset 0 0 0 1px rgba(191,157,92,0.08) !important;
        }

        .fusion-chamber.is-accelerating .fusion-slot-card.is-bound,
        .fusion-chamber.is-locking .fusion-slot-card.is-bound,
        .fusion-chamber.is-revealed .fusion-slot-card.is-bound {
          opacity: 0.34;
          transform: translateY(8px) scale(0.98);
          filter: saturate(0.62) brightness(0.82) blur(0.2px);
        }

        .fusion-chamber.is-locking .fusion-core,
        .fusion-chamber.is-revealed .fusion-core {
          z-index: 4;
        }

        .component-card:hover {
          transform: translateY(-1px);
          border-color: rgba(191,157,92,0.34) !important;
          box-shadow: 0 12px 26px rgba(0,0,0,0.26);
        }

        .result-reveal {
          border-color: rgba(191,157,92,0.28) !important;
          box-shadow: 0 22px 70px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.055) !important;
        }

        .selected-component-body {
          margin-top: 28px;
          display: grid;
          justify-items: center;
          gap: 12px;
          text-align: center;
        }

        .selected-component-body__icon {
          width: 76px;
          height: 76px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle, rgba(218,184,104,0.16), rgba(255,255,255,0.04));
          border: 1px solid rgba(218,184,104,0.32);
          font-size: 36px;
          box-shadow: inset 0 0 24px rgba(0,0,0,0.26);
        }

        .selected-component-body__name {
          font-size: 22px;
          font-weight: 950;
          line-height: 1.1;
          word-break: break-word;
        }

        .selected-component-body__rarity {
          margin-top: 7px;
          font-size: 12px;
          color: #cdb887;
        }

        .fusion-chamber.is-calibrating .fusion-slot.is-acknowledged,
        .fusion-chamber.is-accelerating .fusion-slot.is-acknowledged,
        .fusion-chamber.is-locking .fusion-slot.is-acknowledged {
          animation: none !important;
          transform: none !important;
          filter: none !important;
        }

        .fusion-chamber.is-anticipating .fusion-slot.is-acknowledged {
          opacity: 0.62;
        }

        .fusion-orb-layer {
          --slot-row-height: 178px;
          --core-width: 220px;
          --slot-gap: 18px;
          --side-slot-width: calc((100% - var(--core-width) - (var(--slot-gap) * 2)) / 2);
          --left-origin-x: calc(var(--side-slot-width) / 2);
          --right-origin-x: calc(100% - (var(--side-slot-width) / 2));
          --center-x: 50%;
          --center-y: calc(var(--slot-row-height) / 2);
          position: absolute;
          inset: 24px 24px auto;
          height: var(--slot-row-height);
          z-index: 5;
          pointer-events: none;
        }

        .fusion-ghost-orb {
          position: absolute;
          top: var(--center-y);
          left: var(--left-origin-x);
          min-width: 146px;
          height: 62px;
          padding: 0 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #f3ead7;
          font-size: 22px;
          background:
            radial-gradient(circle at 35% 28%, rgba(255,255,255,0.28), transparent 24%),
            radial-gradient(circle, rgba(191,157,92,0.30), rgba(31,25,15,0.94) 62%);
          border: 1px solid rgba(218,184,104,0.62);
          box-shadow: 0 0 28px rgba(191,157,92,0.28), inset 0 0 18px rgba(0,0,0,0.38);
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.84);
          will-change: left, top, transform, opacity, filter;
        }

        .fusion-ghost-orb.is-right {
          left: var(--right-origin-x);
        }

        .fusion-ghost-orb span {
          display: inline-grid;
          min-width: 34px;
          min-height: 34px;
          place-items: center;
          border-radius: 999px;
          background: rgba(0,0,0,0.22);
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .fusion-ghost-orb strong {
          max-width: 88px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fusion-ghost-orb::after {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: inherit;
          border: 1px solid rgba(218,184,104,0.20);
          opacity: 0.65;
        }

        .fusion-chamber.is-calibrating .fusion-ghost-orb {
          animation: ghostOrbAppear var(--fusion-stage-a-ms, 180ms) ease-out both;
        }

        .fusion-chamber.is-accelerating .fusion-ghost-orb.is-left {
          animation: ghostOrbMoveLeft var(--fusion-stage-b-ms, 260ms) cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-accelerating .fusion-ghost-orb.is-right {
          animation: ghostOrbMoveRight var(--fusion-stage-b-ms, 260ms) cubic-bezier(.2,.72,.22,1) both;
        }

        .fusion-chamber.is-locking .fusion-ghost-orb.is-left,
        .fusion-chamber.is-locking .fusion-ghost-orb.is-right {
          animation: ghostOrbAbsorb var(--fusion-stage-c-ms, 220ms) cubic-bezier(.2,.72,.22,1) both;
          left: var(--center-x);
        }

        .fusion-chamber.is-locking .fusion-orb::before {
          opacity: 1;
          animation: fusionBurst var(--fusion-stage-c-ms, 220ms) ease-out both;
          background: radial-gradient(circle, rgba(226,218,197,0.64) 0 8%, rgba(191,157,92,0.38) 9% 22%, transparent 56%);
        }

        @keyframes fusionBurst {
          0% { opacity: 0; transform: scale(0.4); }
          42% { opacity: 0.88; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.82); }
        }

        @keyframes ghostOrbAppear {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.64); filter: brightness(0.9); }
          28% { opacity: 0.94; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0.86; transform: translate(-50%, -50%) scale(0.94); filter: brightness(1); }
        }

        @keyframes ghostOrbMoveLeft {
          0% { left: var(--left-origin-x); opacity: 0.86; transform: translate(-50%, -50%) scale(0.94); }
          78% { left: var(--center-x); opacity: 1; transform: translate(-50%, -50%) scale(1.04); filter: brightness(1.18); }
          100% { left: var(--center-x); opacity: 0.9; transform: translate(-50%, -50%) scale(0.82); filter: brightness(1.05); }
        }

        @keyframes ghostOrbMoveRight {
          0% { left: var(--right-origin-x); opacity: 0.86; transform: translate(-50%, -50%) scale(0.94); }
          78% { left: var(--center-x); opacity: 1; transform: translate(-50%, -50%) scale(1.04); filter: brightness(1.18); }
          100% { left: var(--center-x); opacity: 0.9; transform: translate(-50%, -50%) scale(0.82); filter: brightness(1.05); }
        }

        @keyframes ghostOrbAbsorb {
          0% { opacity: 0.9; transform: translate(-50%, -50%) scale(0.82); filter: brightness(1.05); }
          48% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.58); filter: brightness(1.5) blur(1px); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); filter: brightness(1.9) blur(4px); }
        }

        @media (max-width: 640px) {
          .fusion-orb-layer {
            --core-height: 104px;
            --center-x: 50%;
            --left-origin-y: calc(var(--slot-row-height) / 2);
            --right-origin-y: calc(var(--slot-row-height) + var(--core-height) + (var(--slot-gap) * 2) + (var(--slot-row-height) / 2));
            --center-y: calc(var(--slot-row-height) + var(--slot-gap) + (var(--core-height) / 2));
            height: calc((var(--slot-row-height) * 2) + var(--core-height) + (var(--slot-gap) * 2));
          }

          .fusion-ghost-orb.is-left {
            left: var(--center-x);
            top: var(--left-origin-y);
          }

          .fusion-ghost-orb.is-right {
            left: var(--center-x);
            top: var(--right-origin-y);
          }

          .fusion-chamber.is-accelerating .fusion-ghost-orb.is-left {
            animation: ghostOrbMoveDown var(--fusion-stage-b-ms, 260ms) cubic-bezier(.2,.72,.22,1) both;
          }

          .fusion-chamber.is-accelerating .fusion-ghost-orb.is-right {
            animation: ghostOrbMoveUp var(--fusion-stage-b-ms, 260ms) cubic-bezier(.2,.72,.22,1) both;
          }

          .fusion-chamber.is-locking .fusion-ghost-orb.is-left,
          .fusion-chamber.is-locking .fusion-ghost-orb.is-right {
            top: var(--center-y);
          }
        }

        @keyframes ghostOrbMoveDown {
          0% { top: var(--left-origin-y); opacity: 0.86; transform: translate(-50%, -50%) scale(0.94); }
          78% { top: var(--center-y); opacity: 1; transform: translate(-50%, -50%) scale(1.04); filter: brightness(1.18); }
          100% { top: var(--center-y); opacity: 0.9; transform: translate(-50%, -50%) scale(0.82); filter: brightness(1.05); }
        }

        @keyframes ghostOrbMoveUp {
          0% { top: var(--right-origin-y); opacity: 0.86; transform: translate(-50%, -50%) scale(0.94); }
          78% { top: var(--center-y); opacity: 1; transform: translate(-50%, -50%) scale(1.04); filter: brightness(1.18); }
          100% { top: var(--center-y); opacity: 0.9; transform: translate(-50%, -50%) scale(0.82); filter: brightness(1.05); }
        }

        .archive-chamber {
          border-radius: 24px;
          padding: 22px;
        }

        .archive-chamber__status {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .archive-chamber__header {
          margin-top: 22px;
          margin-bottom: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .archive-chamber__header > div:first-child {
          min-width: 0;
          flex: 1 1 auto;
        }

        .archive-chamber__header h2 {
          margin: 0;
          font-size: 32px;
          line-height: 1.05;
          font-weight: 950;
        }

        .archive-chamber__header p {
          max-width: 620px;
          margin: 7px 0 0;
          color: rgba(230,233,242,0.66);
          font-size: 14px;
          line-height: 1.45;
        }

        .progress-stats-rail {
          display: grid;
          grid-template-columns: repeat(4, minmax(78px, 1fr));
          gap: 8px;
          min-width: min(100%, 440px);
          width: min(100%, 440px);
          justify-self: end;
        }

        .progress-stats-rail__card {
          padding: 10px 12px;
          border: 1px solid rgba(191,157,92,0.18);
          border-radius: 14px;
          background:
            radial-gradient(circle at top left, rgba(216,191,130,0.09), transparent 50%),
            rgba(0,0,0,0.16);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .progress-stats-rail__card.is-pulsing {
          border-color: rgba(216,191,130,0.42);
          box-shadow:
            0 0 0 1px rgba(216,191,130,0.10),
            0 0 24px rgba(216,191,130,0.14),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .progress-stats-rail__value {
          display: block;
          color: #f3ead7;
          font-size: 18px;
          font-weight: 950;
          line-height: 1;
        }

        .progress-stats-rail small {
          display: block;
          margin-top: 5px;
          color: rgba(230,222,202,0.54);
          font-size: 10px;
          font-weight: 800;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .progress-stats-rail__value {
          transform-origin: left center;
        }

        .craft-screen.is-fusion-active .archive-chamber,
        .craft-screen.is-fusion-active .archive-chamber__status,
        .craft-screen.is-fusion-active .archive-chamber__header,
        .craft-screen.is-fusion-active .progress-stats-rail,
        .craft-screen.is-fusion-active .mobile-collection-drawer,
        .craft-screen.is-fusion-active .demo-start-button,
        .craft-screen.is-fusion-active .phase-notice,
        .craft-screen.is-fusion-active .auth-notice {
          opacity: 0.22;
          transform: translateY(10px) scale(0.985);
          transition: opacity 240ms ease, transform 240ms ease;
        }

        .craft-screen.is-fusion-active .archive-chamber {
          box-shadow: 0 14px 36px rgba(0,0,0,0.14);
        }

        .craft-screen.is-fusion-active .progress-stats-rail__card {
          box-shadow: none;
        }

        .session-control {
          margin-left: auto;
          min-height: 30px;
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(0,0,0,0.18);
          color: #ffb4b4;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .phase-notice,
        .auth-notice,
        .craft-error {
          margin-top: 12px;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
        }

        .phase-notice {
          background: rgba(191,157,92,0.075);
          border: 1px solid rgba(191,157,92,0.22);
          color: #d8bf82;
        }

        .auth-notice {
          background: rgba(255,180,180,0.08);
          border: 1px solid rgba(255,180,180,0.25);
        }

        .auth-notice a {
          color: #ffd1d1;
        }

        .craft-error {
          border: 1px solid rgba(216,191,130,0.18);
          background: rgba(0,0,0,0.18);
          color: rgba(243,234,215,0.72);
          text-align: center;
        }

        .fusion-slot-card.is-error-shake {
          animation: componentSlotShake 250ms ease-in-out;
        }

        .demo-start-button {
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(191,157,92,0.26);
          background: rgba(191,157,92,0.09);
          color: #d8bf82;
          cursor: pointer;
          font-weight: 800;
        }

        .fusion-workspace {
          margin-top: 16px;
          padding: 24px;
          border-radius: 26px;
          border: 1px solid rgba(245,211,107,0.24);
          box-shadow: 0 24px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08);
          transition: border-color 180ms ease, box-shadow 180ms ease, filter 180ms ease;
        }

        .fusion-workspace.is-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 20;
          margin-top: 0;
          padding: clamp(16px, 2.6vw, 34px);
          border: 0;
          border-radius: 0;
          background:
            radial-gradient(circle at 50% 50%, rgba(191,157,92,0.28), transparent 12rem),
            radial-gradient(circle at 50% 50%, rgba(103,232,249,0.10), transparent 22rem),
            linear-gradient(180deg, rgba(4,5,8,0.96), rgba(1,2,4,0.99));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
          backdrop-filter: none;
        }

        .fusion-workspace.is-ready {
          border-color: rgba(216,191,130,0.42);
          box-shadow: 0 28px 76px rgba(0,0,0,0.48), 0 0 34px rgba(191,157,92,0.08), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .fusion-workspace.is-revealed {
          border-color: rgba(216,191,130,0.34);
          box-shadow: 0 30px 86px rgba(0,0,0,0.52), 0 0 42px rgba(191,157,92,0.10), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .fusion-workspace.is-revealed.is-epic {
          background:
            radial-gradient(circle at 50% 48%, rgba(184,115,255,0.18), transparent 13rem),
            radial-gradient(circle at 50% 54%, rgba(191,157,92,0.10), transparent 16rem),
            linear-gradient(180deg, rgba(14,10,18,0.98), rgba(7,8,10,0.96));
          animation: epicWorkspaceReact 1100ms ease-out both;
        }

        .fusion-workspace.is-revealed.is-legendary {
          background:
            linear-gradient(48deg, transparent 0 48%, rgba(216,191,130,0.10) 48.3% 48.7%, transparent 49%),
            radial-gradient(circle at 50% 48%, rgba(216,191,130,0.20), transparent 14rem),
            linear-gradient(180deg, rgba(5,5,6,0.99), rgba(2,3,5,0.99));
          animation: legendaryWorkspaceReact 1400ms ease-out both;
        }

        .fusion-workspace.is-fullscreen .fusion-slots,
        .fusion-workspace.is-fullscreen .fusion-action-row,
        .fusion-workspace.is-fullscreen .craft-error {
          position: relative;
          z-index: 1;
        }

        .fusion-workspace.is-fullscreen .fusion-slots {
          min-height: calc(100vh - 210px);
          align-items: center;
        }

        .fusion-slots {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 360px) minmax(0, 1fr);
          gap: 18px;
          align-items: stretch;
        }

        .fusion-workspace.is-revealed .fusion-slots {
          grid-template-columns: minmax(0, 0.72fr) minmax(320px, 520px) minmax(0, 0.72fr);
        }

        .fusion-slot-card {
          min-height: 178px;
          padding: 18px;
          border-radius: 24px;
          text-align: left;
          color: #e6e9f2;
          cursor: pointer;
          background: linear-gradient(180deg, rgba(238,220,172,0.045), rgba(255,255,255,0.014));
          border: 1px solid rgba(191,157,92,0.20);
          box-shadow: inset 0 0 24px rgba(0,0,0,0.18);
          transition: opacity 180ms ease, border-color 180ms ease, box-shadow 180ms ease, filter 180ms ease;
        }

        .fusion-slot-card:disabled {
          cursor: default;
        }

        .fusion-slot-card.is-bound {
          background: linear-gradient(180deg, rgba(31,25,15,0.92), rgba(8,10,14,0.90));
        }

        .fusion-slot-card.is-active,
        .fusion-workspace.is-ready .fusion-slot-card.is-bound,
        .fusion-workspace:not(.is-idle) .fusion-slot-card.is-bound {
          border-color: rgba(191,157,92,0.62);
          box-shadow: 0 0 20px rgba(191,157,92,0.08), inset 0 0 0 1px rgba(191,157,92,0.07);
        }

        .fusion-slot-card.is-dimmed {
          opacity: 0.56;
          filter: saturate(0.78);
        }

        .fusion-slot-card__header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .fusion-slot-card__label {
          font-size: 11px;
          text-transform: uppercase;
          color: rgba(230,233,242,0.62);
          font-weight: 800;
        }

        .fusion-slot-card.is-active .fusion-slot-card__label {
          color: #d8bf82;
        }

        .fusion-slot-card__clear {
          font-size: 12px;
          color: #ffb4b4;
          cursor: pointer;
          border-radius: 999px;
          padding: 4px 6px;
        }

        .fusion-slot-card__clear:focus-visible,
        .component-card:focus-visible,
        .fuse-button:focus-visible,
        .mobile-collection-drawer__toggle:focus-visible,
        .discovery-actions button:focus-visible {
          outline: 2px solid rgba(216,191,130,0.88);
          outline-offset: 3px;
        }

        .discovery-hint-panel__chips button:focus-visible,
        .discovery-hint-panel__dismiss:focus-visible {
          outline: 2px solid rgba(216,191,130,0.88);
          outline-offset: 3px;
        }

        .fusion-slot-card__empty {
          margin-top: 42px;
          color: rgba(230,233,242,0.58);
          font-size: 14px;
          line-height: 1.35;
          text-align: center;
        }

        .fusion-core {
          min-width: 0;
          width: 100%;
          display: grid;
          place-items: center;
          justify-self: center;
        }

        .fusion-core-eyebrow {
          color: rgba(230,222,202,0.54);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .discovery-reveal {
          width: 100%;
          max-width: 520px;
          min-height: 430px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 12px;
          position: relative;
          z-index: 2;
          justify-self: center;
          text-align: center;
        }

        .discovery-reveal__halo {
          position: absolute;
          width: min(240px, 82vw);
          aspect-ratio: 1;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(218,184,104,0.18), transparent 48%),
            conic-gradient(from 0deg, transparent, rgba(218,184,104,0.22), transparent 34%, rgba(230,222,202,0.12), transparent 70%);
          opacity: 0.72;
          filter: blur(0.2px);
          animation: discoveryHaloTurn 2600ms linear infinite;
          pointer-events: none;
        }

        .discovery-reveal.is-revealed {
          animation: discoveryHeroRise 1400ms cubic-bezier(.16,1,.3,1) both;
        }

        .discovery-hint-panel {
          position: relative;
          width: min(100%, 360px);
          padding: 15px 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(191,157,92,0.18);
          background: rgba(0,0,0,0.20);
          text-align: center;
          opacity: 0;
          transform: translateY(14px);
          animation: discoveryHintRise 760ms var(--fusion-hint-delay-ms, 440ms) cubic-bezier(.16,1,.3,1) forwards;
        }

        .discovery-hint-panel__dismiss {
          position: absolute;
          top: 8px;
          right: 8px;
          min-height: 24px;
          padding: 4px 7px;
          border-radius: 999px;
          border: 1px solid rgba(191,157,92,0.14);
          background: rgba(0,0,0,0.20);
          color: rgba(230,222,202,0.52);
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          cursor: pointer;
        }

        .discovery-hint-panel__dismiss:hover {
          border-color: rgba(216,191,130,0.36);
          color: rgba(243,234,215,0.78);
        }

        .discovery-hint-panel__eyebrow {
          color: #d8bf82;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .discovery-hint-panel__text {
          margin-top: 5px;
          color: rgba(230,222,202,0.68);
          font-size: 12px;
          line-height: 1.35;
        }

        .discovery-hint-panel__chips {
          display: flex;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .discovery-hint-panel__chips span,
        .discovery-hint-panel__chips button {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(191,157,92,0.18);
          background: rgba(191,157,92,0.07);
          color: rgba(243,234,215,0.78);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .discovery-hint-panel__chips button {
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .discovery-hint-panel__chips button:hover {
          transform: translateY(-2px);
          border-color: rgba(216,191,130,0.48);
          background: rgba(191,157,92,0.14);
        }

        .discovery-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .discovery-actions button {
          min-height: 34px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(191,157,92,0.24);
          background: rgba(191,157,92,0.08);
          color: #d8bf82;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          text-transform: uppercase;
        }

        .discovery-actions button:hover {
          border-color: rgba(216,191,130,0.50);
          background: rgba(191,157,92,0.13);
        }

        @keyframes discoveryHintRise {
          from { opacity: 0; transform: translateY(14px); filter: blur(6px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes componentSlotShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }

        .fusion-action-row {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 22px;
          position: relative;
        }

        .fuse-button {
          width: min(100%, 430px);
          min-height: 58px;
          padding: 18px 24px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.09);
          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025));
          color: rgba(230,233,242,0.42);
          font-weight: 900;
          font-size: 15px;
          cursor: default;
          box-shadow: none;
          position: relative;
          overflow: hidden;
          transform-origin: center;
        }

        .fuse-button.is-ready {
          border-color: rgba(191,157,92,0.72);
          background: linear-gradient(180deg, #d8bf82, #a98245);
          color: #111827;
          cursor: pointer;
          box-shadow: 0 14px 32px rgba(0,0,0,0.28), 0 0 14px rgba(191,157,92,0.10), inset 0 1px 0 rgba(255,255,255,0.28);
        }

        .fuse-button.is-loading {
          border-color: rgba(216,191,130,0.78);
          background: linear-gradient(180deg, #f0d996, #b88c47);
          color: #07101b;
          cursor: default;
          box-shadow: 0 16px 38px rgba(0,0,0,0.32), 0 0 28px rgba(216,191,130,0.16), inset 0 1px 0 rgba(255,255,255,0.34);
        }

        .fuse-button.is-ready::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 0 32%, rgba(255,255,255,0.28) 44%, transparent 58% 100%);
          transform: translateX(-120%);
          animation: fuseButtonSweep 3.6s ease-in-out infinite;
          pointer-events: none;
        }

        .fuse-button.is-loading::after {
          animation-duration: 1.6s;
          opacity: 0.9;
        }

        .fuse-energy-trace {
          position: absolute;
          bottom: calc(100% - 4px);
          left: 50%;
          width: 3px;
          height: 150px;
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(216,191,130,0.86), transparent);
          box-shadow: 0 0 22px rgba(216,191,130,0.32);
          transform: translateX(-50%) scaleY(0);
          transform-origin: bottom center;
          animation: fuseEnergyRise 2400ms cubic-bezier(.2,.72,.22,1) both;
          pointer-events: none;
        }

        .discovery-archive {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .discovery-archive.is-inactive {
          pointer-events: none;
        }

        .discovery-archive-empty {
          margin-top: 14px;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid rgba(191,157,92,0.16);
          background: rgba(0,0,0,0.16);
          color: rgba(230,222,202,0.60);
          text-align: center;
          font-size: 13px;
        }

        .component-card {
          min-height: 164px;
          padding: 13px;
          border-radius: 8px;
          clip-path: none !important;
          display: flex;
          flex-direction: column;
          gap: 9px;
          text-align: left;
          cursor: pointer;
          color: #e6e9f2;
          background:
            radial-gradient(circle at 20% 0%, rgba(245,211,107,0.055), transparent 42%),
            linear-gradient(180deg, rgba(255,255,255,0.046), rgba(255,255,255,0.018));
          border: 1px solid rgba(191,157,92,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 8px 22px rgba(0,0,0,0.18);
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease, background 180ms ease;
        }

        .component-card:disabled {
          cursor: default;
        }

        .component-card.is-selected {
          border-color: rgba(216,191,130,0.86) !important;
          box-shadow:
            0 0 0 1px rgba(216,191,130,0.16),
            0 0 28px rgba(216,191,130,0.18),
            inset 0 0 22px rgba(216,191,130,0.075) !important;
        }

        .component-card.is-selected .component-card__icon {
          border-color: rgba(216,191,130,0.42);
          box-shadow: 0 0 18px rgba(216,191,130,0.20), inset 0 0 18px rgba(0,0,0,0.24);
        }

        .component-card:hover:not(:disabled) {
          transform: translateY(-4px);
          border-color: rgba(216,191,130,0.72) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(216,191,130,0.18), transparent 48%),
            linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.024));
          box-shadow: 0 18px 36px rgba(0,0,0,0.34), 0 0 24px rgba(216,191,130,0.12);
        }

        .component-card.is-disabled,
        .discovery-archive.is-inactive .component-card {
          opacity: 0.54;
          pointer-events: none;
          filter: saturate(0.72);
          transform: none !important;
        }

        .component-card__icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background:
            radial-gradient(circle at 50% 28%, rgba(216,191,130,0.12), transparent 58%),
            rgba(0,0,0,0.24);
          border: 1px solid rgba(191,157,92,0.18);
          font-size: 25px;
        }

        .component-card__topline {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .component-card__name {
          margin-top: 1px;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.16;
          min-height: 34px;
          overflow-wrap: anywhere;
        }

        .component-card__subtitle {
          margin-top: -4px;
          color: rgba(230,222,202,0.70);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .component-card__details {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: auto;
        }

        .component-card__details span,
        .component-card__scarcity,
        .component-card__selected-label {
          border: 1px solid rgba(191,157,92,0.15);
          background: rgba(0,0,0,0.18);
          color: rgba(230,222,202,0.66);
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          text-transform: uppercase;
        }

        .component-card__details span {
          padding: 5px 7px;
          border-radius: 999px;
        }

        .component-card__scarcity {
          width: fit-content;
          padding: 5px 7px;
          border-radius: 999px;
          color: rgba(216,191,130,0.78);
        }

        .component-card__selected-label {
          width: fit-content;
          margin-bottom: 1px;
          padding: 5px 7px;
          border-radius: 6px;
          border-color: rgba(216,191,130,0.36);
          background: rgba(216,191,130,0.095);
          color: rgba(245,232,192,0.92);
        }

        .rarity-badge {
          display: inline-flex;
          padding: 4px 7px;
          border: 1px solid rgba(245,211,107,0.18);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .mobile-collection-drawer {
          margin-top: 20px;
          border-top: 1px solid rgba(191,157,92,0.14);
          padding-top: 16px;
        }

        .mobile-collection-drawer__state {
          margin-top: 8px;
          color: rgba(230,222,202,0.52);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .mobile-collection-drawer__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .mobile-collection-drawer__header h3 {
          margin: 3px 0 0;
          font-size: 18px;
          line-height: 1.1;
        }

        .mobile-collection-drawer__eyebrow {
          color: rgba(230,222,202,0.56);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .mobile-collection-drawer__toggle {
          display: none;
          min-height: 34px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(191,157,92,0.24);
          background: rgba(191,157,92,0.08);
          color: #d8bf82;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .mobile-collection-drawer__body {
          display: block;
        }

        @keyframes discoveryHeroRise {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes epicWorkspaceReact {
          0% { filter: brightness(0.82); }
          42% { filter: brightness(1.14) saturate(1.16); }
          100% { filter: brightness(1) saturate(1); }
        }

        @keyframes legendaryWorkspaceReact {
          0% { filter: brightness(0.38) contrast(1.2); }
          22% { filter: brightness(1.24) contrast(1.04); }
          100% { filter: brightness(1) contrast(1); }
        }

        @keyframes fuseButtonSweep {
          0%, 46% { transform: translateX(-120%); opacity: 0; }
          58% { opacity: 0.7; }
          78%, 100% { transform: translateX(120%); opacity: 0; }
        }

        @keyframes fuseEnergyRise {
          0% { opacity: 0; transform: translateX(-50%) scaleY(0); filter: blur(0); }
          18% { opacity: 0.82; transform: translateX(-50%) scaleY(0.38); }
          58% { opacity: 0.92; transform: translateX(-50%) scaleY(1); filter: blur(0.3px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-34px) scaleY(0.18); filter: blur(2px); }
        }

        @keyframes discoveryHaloTurn {
          0% { transform: rotate(0deg) scale(0.94); opacity: 0.48; }
          50% { transform: rotate(180deg) scale(1); opacity: 0.78; }
          100% { transform: rotate(360deg) scale(0.94); opacity: 0.48; }
        }

        @media (max-width: 760px) {
          .archive-chamber {
            padding: 16px;
            border-radius: 20px;
            padding-bottom: calc(var(--mobile-drawer-space, 88px) + 124px);
          }

          .craft-screen.is-fusion-active .archive-chamber {
            --mobile-drawer-space: 0px;
            padding-bottom: 18px;
          }

          .archive-chamber[data-drawer-state="collapsed"] {
            --mobile-drawer-space: 78px;
          }

          .archive-chamber[data-drawer-state="half"] {
            --mobile-drawer-space: 42vh;
          }

          .archive-chamber[data-drawer-state="full"] {
            --mobile-drawer-space: 72vh;
          }

          .archive-chamber__header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .progress-stats-rail {
            width: 100%;
            min-width: 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            position: sticky;
            top: 12px;
            z-index: 6;
          }

          .progress-stats-rail__card {
            padding: 8px 10px;
            border-radius: 12px;
          }

          .progress-stats-rail__value {
            font-size: 16px;
          }

          .fusion-workspace {
            padding: 16px;
            position: relative;
            z-index: 2;
          }

          .fusion-slots {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "left"
              "core"
              "right";
            gap: 12px;
          }

          .fusion-workspace.is-revealed .fusion-slots {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "left"
              "core"
              "right";
          }

          .fusion-slot.is-left {
            grid-area: left;
          }

          .fusion-slot.is-right {
            grid-area: right;
          }

          .fusion-core {
            min-height: 104px;
            grid-area: core;
          }

          .discovery-reveal {
            max-width: 100%;
            min-height: 390px;
          }

          .fuse-button {
            width: 100%;
          }

          .craft-screen.is-fusion-active .mobile-collection-drawer {
            transform: translateY(calc(100% - 12px));
            opacity: 0;
            pointer-events: none;
          }

          .craft-screen.is-fusion-active .fusion-action-row {
            bottom: 18px;
          }

          .mobile-collection-drawer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 16;
            margin: 0;
            padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
            border: 1px solid rgba(191,157,92,0.18);
            border-bottom: 0;
            border-radius: 18px 18px 0 0;
            background:
              radial-gradient(circle at 50% 0%, rgba(191,157,92,0.13), transparent 16rem),
              linear-gradient(180deg, rgba(10,11,13,0.98), rgba(5,6,8,0.98));
            box-shadow: 0 -18px 46px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06);
            height: var(--mobile-drawer-space, 78px);
            overflow: hidden;
          }

          .mobile-collection-drawer__toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 44px;
          }

          .mobile-collection-drawer.is-collapsed .mobile-collection-drawer__body {
            display: none;
          }

          .mobile-collection-drawer.is-half .mobile-collection-drawer__body,
          .mobile-collection-drawer.is-full .mobile-collection-drawer__body {
            display: block;
            max-height: calc(100% - 56px);
            overflow: auto;
            padding-right: 2px;
          }

          .mobile-collection-drawer__collapsed {
            min-height: 44px;
            display: grid;
            align-items: center;
            color: rgba(230,222,202,0.66);
            font-size: 13px;
          }

          .mobile-collection-drawer__groups,
          .mobile-collection-drawer__full {
            display: grid;
            gap: 12px;
          }

          .mobile-collection-drawer__group-title {
            margin-bottom: 8px;
            color: rgba(243,234,215,0.84);
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .mobile-collection-drawer__search-row {
            display: grid;
          }

          .mobile-collection-drawer__search {
            width: 100%;
            min-height: 44px;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid rgba(191,157,92,0.22);
            background: rgba(0,0,0,0.22);
            color: #f3ead7;
            font-size: 14px;
          }

          .mobile-collection-drawer__search::placeholder {
            color: rgba(230,222,202,0.42);
          }

          .mobile-collection-drawer__search:focus-visible,
          .mobile-collection-drawer__filter:focus-visible {
            outline: 2px solid rgba(216,191,130,0.88);
            outline-offset: 3px;
          }

          .mobile-collection-drawer__filters {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .mobile-collection-drawer__filter {
            min-height: 44px;
            padding: 10px 12px;
            border-radius: 999px;
            border: 1px solid rgba(191,157,92,0.18);
            background: rgba(0,0,0,0.18);
            color: rgba(230,222,202,0.74);
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            cursor: pointer;
          }

          .mobile-collection-drawer__filter.is-active {
            border-color: rgba(216,191,130,0.52);
            background: rgba(216,191,130,0.14);
            color: #f3ead7;
          }

          .mobile-collection-drawer .discovery-archive {
            max-height: none;
            overflow: visible;
            padding-right: 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .fusion-action-row {
            position: fixed;
            left: 16px;
            right: 16px;
            bottom: calc(var(--mobile-drawer-space, 78px) + 14px);
            z-index: 15;
            margin-top: 0;
          }

          .fusion-action-row .fuse-button {
            width: 100%;
          }
        }

        @media (max-width: 460px) {
          .mobile-collection-drawer .discovery-archive {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 1ms !important;
          }

          .fusion-chamber.is-calibrating .fusion-ghost-orb,
          .fusion-chamber.is-accelerating .fusion-ghost-orb,
          .fusion-chamber.is-locking .fusion-ghost-orb,
          .fusion-chamber.is-fusing .fusion-orb,
          .fusion-chamber.is-fusing .fusion-core::before,
          .fusion-chamber.is-fusing .fusion-core::after,
          .fusion-chamber.is-fusing .fuse-energy-trace,
          .craft-background__layer,
          .craft-background__traces i,
          .craft-background__nodes span,
          .craft-background__nodes span::before,
          .craft-background__nodes span::after,
          .craft-background__particles span,
          .fusion-core-stage__ring,
          .fusion-core-stage__pulse,
          .fusion-core-stage__stream,
          .fusion-core-stage__token,
          .fusion-core-stage__result,
          .discovery-hint-panel,
          .progress-stats-rail__value,
          .fuse-button.is-ready::after {
            animation: none !important;
          }

          .fusion-ghost-orb,
          .fusion-core-result,
          .fusion-core-stage__result .fusion-core-result,
          .discovery-hint-panel {
            transform: none !important;
            filter: none !important;
          }

          .fusion-core-result,
          .discovery-hint-panel {
            opacity: 1 !important;
          }

          .fusion-workspace.is-fusing .fusion-core {
            filter: none !important;
          }
        }
      `}</style>
      <ArchiveChamber drawerState={drawerState} fusionActive={fusionModeActive}>
        <div className="archive-chamber__status">
          <Pill>{demo ? "Demo mode" : authed ? "Authenticated" : "Not logged in"}</Pill>
          <Pill>Symmetric formulas</Pill>
          <Pill>Discovery archive</Pill>
          {authed && (
            <button
              className="session-control"
              type="button"
              onClick={() => { demo ? exitDemo() : clearToken(); if (!demo) { setHasToken(false); location.href = "/login"; } }}
            >
              {demo ? "Exit demo" : "Log out"}
            </button>
          )}
        </div>

        {demo && (
          <div className="phase-notice">
            Demo mode uses mock items and mock craft results. It is not real wallet authentication.
          </div>
        )}

        <div className="archive-chamber__header">
          <div>
          <h2>Discovery Archive</h2>
          <p>Select two components, start fusion, and resolve the next discovery pattern.</p>
        </div>
          <ProgressStatsRail items={items} />
        </div>

        {!authed && (
          <div className="auth-notice">
            You need to login to craft. Go to <a href="/login">/login</a>.
          </div>
        )}

        {canStartDemo && !demo && (
          <button className="demo-start-button" onClick={startDemo}>
            Continue in demo mode
          </button>
        )}

        <FusionWorkspace
          items={items}
          selectedLeft={selectedLeft}
          selectedRight={selectedRight}
          activeSlot={activeSlot}
          revealState={revealState}
          result={result}
          canCraft={canCraft}
          busy={busy}
          errorMessage={err}
          onSelectSlot={setActiveSlot}
          onClearLeft={() => { clearCraftError(); setLeft(null); }}
          onClearRight={() => { clearCraftError(); setRight(null); }}
          onUseResult={useResultAsComponent}
          onUseSuggestion={useSuggestedPath}
          errorPulse={errorPulse}
          onFuse={doCraft}
        />

        <MobileCollectionDrawer
          items={items}
          left={left}
          right={right}
          inactive={fusionModeActive}
          state={drawerState}
          onStateChange={setDrawerState}
          onChoose={chooseItem}
        />

      </ArchiveChamber>
    </main>
  );
}

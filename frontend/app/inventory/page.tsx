"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api, getToken } from "../lib/api";
import { rarityLabel } from "../lib/rarity";

export default function InventoryPage() {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setErr("You are not logged in. Go to /login.");
      return;
    }
    api.inventory().then(setData).catch(e => setErr(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    const qq = q.trim().toLowerCase();
    if (!qq) return data.items;
    return data.items.filter((x: any) => `${x.item.name}`.toLowerCase().includes(qq));
  }, [data, q]);

  return (
    <main>
      <a href="/" style={{ color: "#b8c4ff" }}>&lt;- Back</a>
      <h2 style={{ marginTop: 10 }}>Inventory</h2>

      {err && <div style={{ color: "#ffb4b4" }}>{err}</div>}

      {data && (
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 16
        }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Wallet: {data.wallet}</div>
            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>
              Discoveries: <b>{data.total_discoveries}</b>
            </div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items..."
            style={{ width: "100%", padding: 10, borderRadius: 12, background: "#0f1624", color: "#e6e9f2", border: "1px solid rgba(255,255,255,0.12)", marginTop: 12 }}
          />

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {filtered.map((x: any) => (
              <div key={x.item.id} style={{
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}>
                <div style={{ fontSize: 18 }}>{x.item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{x.item.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Tier {x.item.tier} - {rarityLabel(x.item.rarity_weight)}
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Crafted <b>{x.times_crafted}</b>x
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

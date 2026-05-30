"use client";

import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard().then(setData).catch(e => setErr(e.message));
  }, []);

  return (
    <main>
      <a href="/" style={{ color: "#b8c4ff" }}>&lt;- Back</a>
      <h2 style={{ marginTop: 10 }}>Leaderboard</h2>

      {err && <div style={{ color: "#ffb4b4" }}>{err}</div>}

      {data && (
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 16
        }}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.rows.map((r: any, idx: number) => (
              <div key={r.wallet} style={{
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gridTemplateColumns: "48px 1fr 120px 120px",
                gap: 10,
                alignItems: "center"
              }}>
                <div style={{ fontWeight: 900, opacity: 0.85 }}>#{idx + 1}</div>
                <div style={{ fontSize: 12, opacity: 0.85, wordBreak: "break-all" }}>{r.wallet}</div>
                <div style={{ textAlign: "right" }}><b>{r.discoveries}</b> <span style={{ fontSize: 12, opacity: 0.8 }}>disc</span></div>
                <div style={{ textAlign: "right" }}><b>{r.rare_score}</b> <span style={{ fontSize: 12, opacity: 0.8 }}>rare</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

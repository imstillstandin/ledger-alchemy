"use client";

import React, { useState } from "react";
import { api, setToken } from "../lib/api";
import { setDemoMode } from "../lib/demo";
import { signMessage } from "../lib/wallet";

export default function LoginPage() {
  const [wallet, setWallet] = useState("");
  const [nonce, setNonce] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canStartDemo, setCanStartDemo] = useState(false);

  async function getChallenge() {
    setErr(null);
    setBusy(true);
    try {
      const res = await api.challenge(wallet.trim());
      setNonce(res.nonce);
      setMessage(res.message);
      setCanStartDemo(false);
    } catch (e: any) {
      setErr(e.message);
      setCanStartDemo(true);
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    setErr(null);
    setBusy(true);
    try {
      let signature: string | null = null;
      if (message) {
        signature = await signMessage(message);
      }
      const res = await api.login(wallet.trim(), nonce!, signature || undefined);
      setToken(res.token);
      setDemoMode(false);
      window.location.href = "/";
    } catch (e: any) {
      setErr(e.message);
      setCanStartDemo(true);
    } finally {
      setBusy(false);
    }
  }

  function continueDemo() {
    setDemoMode(true);
    window.location.href = "/";
  }

  return (
    <main>
      <a href="/" style={{ color: "#b8c4ff" }}>&lt;- Back</a>
      <h2 style={{ marginTop: 10 }}>Login</h2>

      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 16
      }}>
        <label style={{ fontSize: 12, opacity: 0.9 }}>Wallet address</label>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="r..."
          style={{ width: "100%", padding: 10, borderRadius: 12, background: "#0f1624", color: "#e6e9f2", border: "1px solid rgba(255,255,255,0.12)", marginTop: 6 }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={getChallenge}
            disabled={busy || wallet.trim().length < 25}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#e6e9f2", cursor: "pointer" }}
          >
            {busy ? "Working..." : "Get challenge"}
          </button>

          <button
            onClick={login}
            disabled={busy || !nonce}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: nonce ? "linear-gradient(135deg, #6ee7ff, #b873ff)" : "rgba(255,255,255,0.08)", color: "#0b0f17", fontWeight: 800, cursor: nonce ? "pointer" : "not-allowed" }}
          >
            {busy ? "Logging in..." : "Login"}
          </button>
        </div>

        {message && (
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85, whiteSpace: "pre-wrap" }}>
            Challenge: {message}
            {"\n\n"}
            MVP note: signing is stubbed, backend enforces nonce and address format only.
          </div>
        )}

        {err && <div style={{ marginTop: 12, color: "#ffb4b4" }}>{err}</div>}

        {canStartDemo && (
          <div style={{ marginTop: 12 }}>
            <button
              onClick={continueDemo}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(245,211,107,0.28)", background: "rgba(245,211,107,0.10)", color: "#f5d36b", cursor: "pointer", fontWeight: 800 }}
            >
              Continue in demo mode
            </button>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Demo mode uses mock items and is not real wallet authentication.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

import React from "react";

export const metadata = {
  title: "Ledger Alchemy",
  description: "Craft, discover, and climb the leaderboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        background: "#0b0f17",
        color: "#e6e9f2"
      }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: 16 }}>
          <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6ee7ff, #b873ff)",
              display: "grid", placeItems: "center", fontWeight: 800, color: "#0b0f17"
            }}>LA</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Ledger Alchemy</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Craft and discover</div>
            </div>
          </header>
          {children}
          <footer style={{ marginTop: 28, opacity: 0.7, fontSize: 12 }}>
            MVP mode: wallet signature verification is TODO.
          </footer>
        </div>
      </body>
    </html>
  );
}

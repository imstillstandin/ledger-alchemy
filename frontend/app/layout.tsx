import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Ledger Alchemy",
  description: "Fuse components, resolve discoveries, and climb the leaderboard.",
};

const navItems = [
  { href: "/", label: "Fusion" },
  { href: "/inventory", label: "Archive" },
  { href: "/leaderboard", label: "Signals" },
  { href: "/login", label: "Access" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <div className="app-shell__atmosphere" aria-hidden="true">
            <div className="app-shell__gradient app-shell__gradient--one" />
            <div className="app-shell__gradient app-shell__gradient--two" />
            <div className="app-shell__grid" />
            <div className="app-shell__noise" />
          </div>

          <header className="app-shell__header">
            <Link className="app-shell__brand" href="/" aria-label="Ledger Alchemy home">
              <span className="app-shell__mark">LA</span>
              <span>
                <span className="app-shell__title">Ledger Alchemy</span>
                <span className="app-shell__subtitle">Discovery fusion system</span>
              </span>
            </Link>
            <nav className="app-shell__nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>{item.label}</Link>
              ))}
            </nav>
          </header>

          <div className="app-shell__content">{children}</div>
        </div>
        <style>{`
          :root {
            color-scheme: dark;
            --shell-bg: #05070d;
            --shell-ink: #edf0f6;
            --shell-muted: rgba(237,240,246,0.64);
            --shell-line: rgba(201, 178, 121, 0.16);
            --shell-gold: #d7bd7a;
          }

          * { box-sizing: border-box; }

          html, body { min-height: 100%; }

          body {
            margin: 0;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--shell-bg);
            color: var(--shell-ink);
            overflow-x: hidden;
          }

          a { color: inherit; }

          .app-shell {
            min-height: 100vh;
            position: relative;
            isolation: isolate;
            background:
              radial-gradient(circle at 18% 8%, rgba(215,189,122,0.15), transparent 28rem),
              radial-gradient(circle at 82% 2%, rgba(110,231,255,0.08), transparent 32rem),
              linear-gradient(180deg, #070a12 0%, #05070d 48%, #030409 100%);
          }

          .app-shell__atmosphere {
            position: fixed;
            inset: 0;
            z-index: -1;
            overflow: hidden;
            pointer-events: none;
          }

          .app-shell__gradient {
            position: absolute;
            width: 42vw;
            height: 42vw;
            min-width: 420px;
            min-height: 420px;
            border-radius: 999px;
            filter: blur(52px);
            opacity: 0.18;
          }

          .app-shell__gradient--one {
            left: -16vw;
            top: 8vh;
            background: rgba(215,189,122,0.58);
          }

          .app-shell__gradient--two {
            right: -18vw;
            bottom: -18vh;
            background: rgba(70,112,128,0.64);
          }

          .app-shell__grid {
            position: absolute;
            inset: 0;
            opacity: 0.26;
            background-image:
              linear-gradient(rgba(215,189,122,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(215,189,122,0.07) 1px, transparent 1px),
              linear-gradient(115deg, transparent 0 48%, rgba(110,231,255,0.05) 49% 50%, transparent 51% 100%);
            background-size: 72px 72px, 72px 72px, 240px 240px;
            mask-image: radial-gradient(circle at 50% 20%, black 0%, transparent 74%);
          }

          .app-shell__noise {
            position: absolute;
            inset: 0;
            opacity: 0.08;
            background-image:
              repeating-radial-gradient(circle at 18% 32%, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px),
              repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px);
            mix-blend-mode: overlay;
          }

          .app-shell__header {
            position: sticky;
            top: 0;
            z-index: 30;
            width: 100%;
            min-height: 72px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 14px clamp(16px, 3vw, 48px);
            border-bottom: 1px solid rgba(215,189,122,0.12);
            background: linear-gradient(180deg, rgba(5,7,13,0.88), rgba(5,7,13,0.58));
            backdrop-filter: blur(18px);
          }

          .app-shell__brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            text-decoration: none;
          }

          .app-shell__mark {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            color: #05070d;
            font-weight: 900;
            letter-spacing: -0.04em;
            background:
              linear-gradient(135deg, rgba(255,242,194,0.96), rgba(180,141,68,0.94)),
              linear-gradient(180deg, rgba(255,255,255,0.35), transparent);
            box-shadow: 0 0 0 1px rgba(255,255,255,0.2), 0 14px 42px rgba(215,189,122,0.18);
          }

          .app-shell__title,
          .app-shell__subtitle {
            display: block;
            line-height: 1.05;
          }

          .app-shell__title {
            font-size: 17px;
            font-weight: 850;
            letter-spacing: 0.02em;
          }

          .app-shell__subtitle {
            margin-top: 4px;
            color: var(--shell-muted);
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .app-shell__nav {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px;
            border: 1px solid rgba(215,189,122,0.12);
            border-radius: 999px;
            background: rgba(255,255,255,0.035);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          }

          .app-shell__nav a {
            text-decoration: none;
            color: rgba(237,240,246,0.72);
            font-size: 12px;
            font-weight: 750;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 9px 12px;
            border-radius: 999px;
            transition: color 150ms ease, background 150ms ease;
          }

          .app-shell__nav a:hover,
          .app-shell__nav a:focus-visible {
            color: #fff6d6;
            background: rgba(215,189,122,0.11);
            outline: none;
          }

          .app-shell__content {
            width: 100%;
            min-height: calc(100vh - 72px);
          }

          @media (max-width: 720px) {
            .app-shell__header {
              align-items: flex-start;
              flex-direction: column;
              gap: 12px;
              min-height: 112px;
            }

            .app-shell__nav {
              width: 100%;
              overflow-x: auto;
              justify-content: flex-start;
              scrollbar-width: none;
            }

            .app-shell__nav::-webkit-scrollbar { display: none; }

            .app-shell__content {
              min-height: calc(100vh - 112px);
            }
          }
        `}</style>
      </body>
    </html>
  );
}

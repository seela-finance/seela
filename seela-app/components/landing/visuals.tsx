// Compact platform mockups used as illustrations on the landing page.
// Each is wrapped in a browser frame and echoes a real Seela screen.
// Ported from the designer's `landing-v2.html`.
import type { CSSProperties, ReactNode } from 'react'
import {
  SparkleGlyph, IconRefresh, IconCalendar, IconClock, IconClose,
  IconLink, IconPdf, IconCheckSm, IconSend,
} from './icons'

export function BrowserFrame({ url = 'app.seela.fr', children, bodyStyle, barDark }: {
  url?: string
  children: ReactNode
  bodyStyle?: CSSProperties
  barDark?: boolean
}) {
  return (
    <div className="lp-frame">
      <div className="lp-frame__bar" style={barDark ? { background: "#0E0E22", borderColor: "rgba(255,255,255,0.08)" } : undefined}>
        <span className="lp-frame__dot" style={barDark ? { background: "rgba(255,255,255,0.18)" } : undefined}></span>
        <span className="lp-frame__dot" style={barDark ? { background: "rgba(255,255,255,0.18)" } : undefined}></span>
        <span className="lp-frame__dot" style={barDark ? { background: "rgba(255,255,255,0.18)" } : undefined}></span>
        <span className="lp-frame__url" style={barDark ? { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" } : undefined}>{url}</span>
      </div>
      <div className="lp-frame__body" style={bodyStyle}>{children}</div>
    </div>
  )
}

// ---- Visual 1: Marketplace (you choose supplier, we find financing) ----
export function VisualMarketplace() {
  // Real partner logos served from /public/landing.
  // - White/monochrome logo on transparent bg → keep `bg` (brand color), logo centers inside.
  // - Logo that already includes its own colored square → `fill: true` (edge-to-edge).
  // - Wide/wordmark logo on white → `tile: true` (white tile, logo contained).
  const offers = [
    { logo: "BL", bg: "#0F7B6C", img: "/landing/bnp-lease.png", fill: true, name: "BNP Lease", m: "1 284 €", score: 94, best: true },
    { logo: "FF", bg: "#E2001A", img: "/landing/franfinance.jpg", fill: true, name: "Franfinance", m: "1 296 €", score: 91 },
    { logo: "CA", bg: "#0E7C5F", img: "/landing/ca-leasing.jpg", tile: true, name: "CA Leasing", m: "1 312 €", score: 88 },
    { logo: "GR", bg: "#1A1A18", img: "/landing/grenke.png", fill: true, name: "Grenke", m: "982 €", score: 82 },
  ] as { logo: string; bg: string; img?: string; fill?: boolean; tile?: boolean; name: string; m: string; score: number; best?: boolean }[]
  return (
    <BrowserFrame url="app.seela.fr/offres" bodyStyle={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
        <SparkleGlyph size={12} /> 8 offres consolidées en 47 secondes
      </div>
      {/* Hero offer */}
      <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 8, background: "linear-gradient(135deg, #1A1A18 0%, #2A2A8C 100%)", color: "#FAFAF9", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div className={"mini-logo" + (offers[0].fill ? " mini-logo--fill" : "")} style={{ background: "#0F7B6C", width: 30, height: 30, fontSize: 11 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {offers[0].img ? <img src={offers[0].img} alt="BNP Lease" /> : "BL"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>BNP Lease</div>
          <div style={{ fontSize: 10.5, color: "#C8C8E8" }}>Recommandée · Score Seela 94</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>1 284 €</div>
          <div style={{ fontSize: 10, color: "#C8C8E8" }}>/ mois · 36 mois</div>
        </div>
      </div>
      {offers.slice(1).map((o, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 6, background: "var(--surface)" }}>
          <div className={"mini-logo" + (o.fill ? " mini-logo--fill" : "") + (o.tile ? " mini-logo--tile" : "")} style={{ background: o.bg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {o.img ? <img src={o.img} alt={o.name} /> : o.logo}
          </div>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{o.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 36, height: 3, background: "var(--elevated)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: o.score + "%", height: "100%", background: "var(--accent)", opacity: 0.8 }}></div>
            </div>
            <span className="num" style={{ fontSize: 10.5, color: "var(--text-3)" }}>{o.score}</span>
          </div>
          <div className="num" style={{ fontSize: 13, fontWeight: 600, width: 60, textAlign: "right" }}>{o.m}</div>
        </div>
      ))}
    </BrowserFrame>
  )
}

// ---- Visual 2: Contract management (transparent & flexible) ----
export function VisualContract() {
  return (
    <BrowserFrame url="app.seela.fr/contrats/C-2026-0142" bodyStyle={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>C-2026-0142</span>
        <span className="badge badge--success" style={{ fontSize: 10.5 }}><span className="dot"></span>Actif</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>MacBook Pro M4 × 24 + écrans</div>
      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 14 }}>BNP Lease · Crédit-bail · Option d&apos;achat 1 €</div>

      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
        <span>Échéance 28 / 36</span>
        <span className="num">17 472 € restants</span>
      </div>
      <div style={{ height: 5, background: "var(--elevated)", borderRadius: 99, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: "78%", height: "100%", background: "var(--accent)" }}></div>
      </div>

      {/* Flexible actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { i: <IconRefresh size={13} />, l: "Refinancer", hot: true },
          { i: <IconCalendar size={13} />, l: "Reporter une échéance" },
          { i: <IconClock size={13} />, l: "Suspendre" },
          { i: <IconClose size={13} />, l: "Résilier par anticipation" },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", border: "1px solid " + (a.hot ? "var(--accent-soft-2)" : "var(--border)"), background: a.hot ? "var(--accent-soft)" : "var(--surface)", borderRadius: 8, fontSize: 11.5, fontWeight: 500, color: a.hot ? "var(--accent-strong)" : "var(--text-2)" }}>
            <span style={{ color: a.hot ? "var(--accent)" : "var(--text-3)" }}>{a.i}</span> {a.l}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: "9px 11px", background: "var(--elevated)", borderRadius: 8, fontSize: 11, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
        <SparkleGlyph size={11} color="var(--accent)" />
        Refinancement détecté : économisez ~1 240 € sur les loyers restants.
      </div>
    </BrowserFrame>
  )
}

// ---- Visual 3: Scoring that grows with the company ----
export function VisualScoring() {
  const bars = [38, 44, 41, 52, 58, 64, 72, 78, 86]
  return (
    <BrowserFrame url="app.seela.fr/scoring" bodyStyle={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 3 }}>Capacité d&apos;engagement</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>62 500 €</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span className="badge badge--success" style={{ fontSize: 10.5 }}>+18% ce trimestre</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--accent)", fontWeight: 500, background: "var(--accent-soft)", padding: "4px 9px", borderRadius: 99 }}>
            <span className="dot-pulse"><span></span><span></span><span></span></span> Score live
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8, letterSpacing: "-0.02em" }}>B+</div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, padding: "0 2px" }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, height: b + "%", borderRadius: "4px 4px 0 0", background: i === bars.length - 1 ? "var(--accent)" : "var(--accent-soft-2)", transition: "height .3s" }}></div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>
        <span>Sept.</span><span>Oct.</span><span>Nov.</span><span>Déc.</span><span>Janv.</span><span>Fév.</span><span>Mars</span><span>Avr.</span><span>Mai</span>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-2)" }}>
        <IconLink size={12} style={{ color: "var(--success)" }} />
        Connecté à votre open banking · réévalué chaque jour
      </div>
    </BrowserFrame>
  )
}

// ---- Hero visual: conversational devis (split view) ----
export function VisualConversation() {
  const lines = [
    { ref: "MBP14-M4", label: "Logitech Rally Bar - Salle de réunion", cat: "Audiovisuel", catColor: "#5B5BD6", total: "23 120 €", checked: true },
    { ref: "PE-R760", label: "Serveur Dell PowerEdge R760", cat: "Infrastructure IT", catColor: "#0E7C5F", total: "11 200 €", checked: true },
    { ref: "AERON-B", label: "Fauteuil Herman Miller Aeron", cat: "Mobilier", catColor: "#B45309", total: "5 560 €", checked: true },
    { ref: "DELONGHI", label: "Machine à café De'Longhi Pro", cat: "CHR · pause café", catColor: "#C026A3", total: "1 890 €", checked: false },
    { ref: "INSTALL", label: "Installation sur site", cat: "Service · non finançable", catColor: "#9A9A93", total: "1 200 €", checked: false, dis: true },
  ]
  return (
    <BrowserFrame url="app.seela.fr/financement">
      <div className="lp-hero-visual" style={{ textAlign: "left" }}>
        {/* LEFT — document canvas */}
        <div style={{ background: "var(--elevated)", padding: 16, overflow: "hidden" }}>
          {/* file header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-2)" }}><IconPdf size={11} /></div>
            <div style={{ fontSize: 10.5, fontWeight: 500 }}>Devis_TechParts_2026-05-22.pdf</div>
          </div>
          {/* page */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em" }}>TechParts Industries</div>
              <div style={{ fontSize: 9, color: "var(--text-3)" }} className="mono">DEV-2026-1452</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 9.5, color: "var(--accent)", fontWeight: 500 }}>
              <SparkleGlyph size={9} /> Lignes détectées par Seela
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 7px", borderRadius: 5, marginBottom: 2, background: l.checked ? "var(--accent-soft)" : "transparent", border: "1px solid " + (l.checked ? "var(--accent-soft-2)" : "transparent"), opacity: l.dis ? 0.5 : 1 }}>
                <div className={"checkbox" + (l.checked ? " checkbox--checked" : "")} style={{ width: 13, height: 13, borderRadius: 3 }}>
                  {l.checked && <IconCheckSm size={8} />}
                  {l.dis && <IconClose size={8} style={{ color: "var(--text-3)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8.5, color: "var(--text-3)" }}>
                    <span style={{ width: 4, height: 4, borderRadius: 99, background: l.catColor }}></span>{l.cat}
                  </div>
                </div>
                <div className="num" style={{ fontSize: 10, fontWeight: 500 }}>{l.total}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — chat */}
        <div className="lp-hero-visual__chat" style={{ background: "var(--surface)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--text)", color: "var(--bg)", display: "grid", placeItems: "center" }}><SparkleGlyph size={10} color="#FAFAF9" /></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500 }}>Assistant Seela</div>
              <div style={{ fontSize: 9, color: "var(--text-3)" }}>En conversation · 3 lignes sélectionnées</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
            {/* AI bubble */}
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: "var(--text)", color: "var(--bg)", display: "grid", placeItems: "center", flexShrink: 0 }}><SparkleGlyph size={8} color="#FAFAF9" /></div>
              <div style={{ fontSize: 10.5, lineHeight: 1.5, color: "var(--text)" }}>J&apos;ai analysé votre devis : 8 lignes, 5 finançables. Cochez celles à inclure.</div>
            </div>
            {/* user bubble */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: "var(--accent-soft)", color: "var(--accent-strong)", borderRadius: 9, padding: "6px 10px", fontSize: 10.5, maxWidth: "85%" }}>3 lignes sélectionnées — 39 880 € HT.</div>
            </div>
            {/* AI bubble + chips */}
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: "var(--text)", color: "var(--bg)", display: "grid", placeItems: "center", flexShrink: 0 }}><SparkleGlyph size={8} color="#FAFAF9" /></div>
              <div>
                <div style={{ fontSize: 10.5, lineHeight: 1.5, color: "var(--text)", marginBottom: 7 }}>Parfait. Quelle est la durée de location souhaitée ?</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {["24 mois", "36 mois", "48 mois"].map((d, i) => (
                    <span key={d} style={{ padding: "4px 9px", borderRadius: 99, border: "1px solid " + (i === 1 ? "var(--accent)" : "var(--border-strong)"), background: i === 1 ? "var(--accent-soft)" : "var(--surface)", color: i === 1 ? "var(--accent-strong)" : "var(--text-2)", fontSize: 9.5, fontWeight: 500 }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* composer */}
          <div style={{ padding: 11, borderTop: "1px solid var(--border)" }}>
            <div style={{ border: "1px solid var(--border-strong)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--text-3)", flex: 1 }}>Précisez vos conditions…</span>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center" }}><IconSend size={10} /></div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

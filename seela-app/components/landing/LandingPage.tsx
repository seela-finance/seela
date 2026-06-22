'use client'

// Everlease — Landing page. Ported from the designer's `landing-v2.html`;
// the `Everlease.html` links were remapped to `/auth`, and the nav keeps an
// authenticated pill (user email → /app/dashboard) when connected.
import React from 'react'
import Link from 'next/link'
import {
  SparkleGlyph, EverleaseMark, IconArrowRight, IconUpload, IconAttach, IconCheck, IconCheckSm,
  IconClose, IconClock, IconRefresh, IconLock, IconShield, IconStore, IconLaptop, IconPrinter,
  IconMedical, IconFactory, IconChair, IconTruck, IconCamera, IconTool,
  IconServerStack, IconSolar, IconResto, IconUser, type IconProps,
} from './icons'
import { VisualConversation, VisualMarketplace, VisualContract, VisualScoring } from './visuals'

function Logo({ size = 22, dark }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size + 4, height: size + 4, borderRadius: 7, background: dark ? "#FAFAF9" : "var(--text)", display: "grid", placeItems: "center" }}>
        <EverleaseMark size={size + 4} color={dark ? "#0E0E0C" : "#FAFAF9"} />
      </div>
      <div style={{ fontSize: size * 0.74, fontWeight: 600, letterSpacing: "-0.03em", color: dark ? "#FAFAF9" : "var(--text)" }}>everlease</div>
    </div>
  )
}

function Nav({ userEmail }: { userEmail?: string | null }) {
  return (
    <nav className="lp-nav">
      <div className="lp-wrap lp-nav__inner">
        <Logo size={20} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {userEmail ? (
            <Link className="lp-user" href="/app/dashboard">
              <span className="lp-user__avatar"><IconUser size={15} /></span>
              <span>
                <span className="lp-user__action">Go to app <IconArrowRight size={13} /></span>
                <span className="lp-user__email" style={{ display: "block" }}>{userEmail}</span>
              </span>
            </Link>
          ) : (
            <>
              <Link className="btn btn--ghost lp-nav__login" href="/auth">Se connecter</Link>
              <Link className="btn btn--accent" href="/auth">Financer un équipement</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

/* ---------------- BLOCK 1 — HERO ---------------- */
function Hero({ onOpenExpert }: { onOpenExpert: () => void }) {
  return (
    <header className="lp-hero">
      <div className="lp-hero__bg"></div>
      <div className="lp-hero__grid"></div>
      <div className="lp-wrap" style={{ position: "relative", textAlign: "center", maxWidth: 860 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <span className="lp-eyebrow"><SparkleGlyph size={12} /> La location d&apos;équipement des entreprises en croissance</span>
        </div>
        <h1 className="lp-h1">Une nouvelle façon de<br/>financer vos équipements.</h1>
        <p className="lp-lede" style={{ margin: "22px auto 0", maxWidth: 600 }}>
          Everlease vous conseille dans le financement de vos actifs matériels en quelques minutes, dans les meilleures conditions. Déposez un devis, choisissez votre offre, signez.
        </p>
        <div className="lp-cta-row" style={{ marginTop: 32 }}>
          <a className="btn btn--accent btn--lg" href="#try">Estimer mon financement <IconArrowRight /></a>
          <button className="btn btn--secondary btn--lg" type="button" onClick={onOpenExpert}>Parler à un expert</button>
        </div>
        <div className="lp-steps" style={{ justifyContent: "center", marginTop: 28 }}>
          {["Leasing", "LLD", "LOA", "Crédit-bail", "Lease-back"].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-2)" }}>{s}</span>
              {i < arr.length - 1 && <span style={{ width: 4, height: 4, borderRadius: 99, background: "var(--border-strong)" }}></span>}
            </React.Fragment>
          ))}
        </div>

        {/* Hero visual */}
        <div style={{ marginTop: 48, maxWidth: 920, margin: "48px auto 0" }}>
          <VisualConversation />
        </div>

        {/* Trust row */}
        <div style={{ marginTop: 48 }}>
          <div className="lp-kicker" style={{ marginBottom: 16 }}>14 partenaires financeurs consultés à chaque demande</div>
          <div className="lp-logos" style={{ justifyContent: "center" }}>
            {["BNP Lease", "SG Equipment", "CA Leasing", "BPCE Lease", "Grenke", "Franfinance"].map(l => (
              <span key={l} className="lp-logos__item">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

/* ---------------- BLOCK 2 — FAKE IT (dropzone + fake analysis) ---------------- */
const TRY_LINES = [
  { ref: "MBP14-M4", label: "MacBook Pro 14\" M4 Pro × 8", total: "23 120 €", ok: true },
  { ref: "DISPLAY", label: "Apple Studio Display × 6", total: "12 594 €", ok: true },
  { ref: "AERON", label: "Fauteuils Herman Miller × 4", total: "5 560 €", ok: true },
  { ref: "INSTALL", label: "Installation sur site", total: "1 200 €", ok: false },
]

function TryBlock() {
  const [stage, setStage] = React.useState<'idle' | 'analyzing' | 'done'>('idle')
  const [visibleLines, setVisibleLines] = React.useState(0)

  const start = () => {
    setStage("analyzing")
    setVisibleLines(0)
    let n = 0
    const int = setInterval(() => {
      n++
      setVisibleLines(n)
      if (n >= TRY_LINES.length) {
        clearInterval(int)
        setTimeout(() => setStage("done"), 700)
      }
    }, 420)
  }

  const reset = () => { setStage("idle"); setVisibleLines(0) }

  return (
    <section id="try" className="lp-section" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="lp-wrap" style={{ maxWidth: 760, textAlign: "center" }}>
        <span className="lp-eyebrow"><SparkleGlyph size={12} /> Essayez maintenant — sans créer de compte</span>
        <h2 className="lp-h2" style={{ marginTop: 18 }}>Déposez un devis. Voyez si c&apos;est finançable.</h2>
        <p className="lp-lede" style={{ margin: "16px auto 0", maxWidth: 540 }}>
          Everlease utilise l&apos;intelligence artificielle pour analyser vos besoins en financement d&apos;équipements et vous proposer les offres adaptées. Aucune donnée bancaire requise.
        </p>

        <div style={{ marginTop: 36, textAlign: "left" }}>
          {/* IDLE — dropzone */}
          {stage === "idle" && (
            <div
              onClick={start}
              className="card"
              style={{ padding: "48px 24px", textAlign: "center", cursor: "pointer", borderStyle: "dashed", borderWidth: 1.5, borderColor: "var(--border-strong)", transition: "border-color .15s, background .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-soft)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--surface)" }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--elevated)", margin: "0 auto 16px", display: "grid", placeItems: "center", color: "var(--text-2)" }}>
                <IconUpload size={22} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Glissez un devis ou une facture</div>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>PDF, JPG ou PNG · ou cliquez pour utiliser un exemple</div>
              <span className="btn btn--secondary"><IconAttach /> Essayer avec un devis d&apos;exemple</span>
            </div>
          )}

          {/* ANALYZING / DONE — document analysis card */}
          {stage !== "idle" && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: stage === "done" ? "var(--success-soft)" : "var(--accent-soft)", display: "grid", placeItems: "center", color: stage === "done" ? "var(--success)" : "var(--accent)" }}>
                  {stage === "done" ? <IconCheck size={16} /> : <SparkleGlyph size={15} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Devis_TechParts_2026-05-22.pdf</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {stage === "analyzing" ? "Analyse en cours…" : "8 lignes lues · 5 éligibles au financement"}
                  </div>
                </div>
                {stage === "analyzing" ? <div className="dot-pulse"><span></span><span></span><span></span></div> : <button className="btn btn--ghost btn--sm" onClick={reset} style={{ color: "var(--text-3)" }}><IconRefresh /></button>}
              </div>

              {/* Lines */}
              <div style={{ padding: "8px 12px" }}>
                {TRY_LINES.map((l, i) => {
                  const shown = i < visibleLines
                  return (
                    <div key={l.ref} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", opacity: shown ? 1 : 0.25, borderBottom: i < TRY_LINES.length - 1 ? "1px solid var(--border)" : 0, transition: "opacity .35s ease" }}>
                      <div className={"checkbox" + (shown && l.ok ? " checkbox--checked" : "")} style={!l.ok && shown ? { borderColor: "var(--border-strong)" } : undefined}>
                        {shown && l.ok && <IconCheckSm size={10} />}
                        {shown && !l.ok && <IconClose size={10} style={{ color: "var(--text-3)" }} />}
                      </div>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", width: 64 }}>{l.ref}</span>
                      <span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
                      {shown && !l.ok && <span className="badge badge--outline" style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>Service · non finançable</span>}
                      <span className="num" style={{ fontSize: 13, fontWeight: 500, width: 80, textAlign: "right" }}>{l.total}</span>
                    </div>
                  )
                })}
              </div>

              {/* Result */}
              {stage === "done" && (
                <div style={{ padding: 18, background: "linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 100%)", borderTop: "1px solid var(--accent-soft-2)" }}>
                  <div className="lp-try-result">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <SparkleGlyph size={15} color="var(--accent)" /> Bonne nouvelle — c&apos;est finançable.
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>
                        Au moins <strong style={{ color: "var(--text)", fontWeight: 600 }}>3 leasers</strong> peuvent financer ce matériel. Estimation : à partir de <strong style={{ color: "var(--text)", fontWeight: 600 }}>982 € / mois</strong> sur 48 mois.
                      </div>
                    </div>
                    <Link className="btn btn--accent btn--lg" href="/auth" style={{ whiteSpace: "nowrap" }}>
                      Créer un compte pour voir les offres <IconArrowRight />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-3)", display: "flex", justifyContent: "center", gap: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconLock size={11} /> Vos données sont sécurisées et restent en Europe</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconShield size={11} /> Aucune carte ni RIB demandé</span>
        </div>
      </div>
    </section>
  )
}

/* ---------------- BLOCK — FINANCEABLE EQUIPMENT TYPES ---------------- */
const EQUIPMENT_CATS: { icon: (p: IconProps) => React.JSX.Element; label: string; ex: string }[] = [
  { icon: IconLaptop, label: "Informatique & IT", ex: "Ordinateurs, serveurs, réseau" },
  { icon: IconPrinter, label: "Bureautique", ex: "Imprimantes, copieurs, écrans" },
  { icon: IconMedical, label: "Matériel médical", ex: "Imagerie, dentaire, laboratoire" },
  { icon: IconFactory, label: "Machines & fabrication", ex: "CNC, robotique, impression 3D" },
  { icon: IconChair, label: "Mobilier & agencement", ex: "Bureaux, sièges, cloisons" },
  { icon: IconTruck, label: "Véhicules & flotte", ex: "Utilitaires, engins, remorques" },
  { icon: IconCamera, label: "Audiovisuel & production", ex: "Caméras, son, éclairage" },
  { icon: IconResto, label: "CHR & restauration", ex: "Cuisines pro, froid, mobilier" },
  { icon: IconTool, label: "BTP & outillage", ex: "Échafaudages, engins, outils" },
  { icon: IconServerStack, label: "Télécom & datacenter", ex: "Baies, switches, téléphonie" },
  { icon: IconSolar, label: "Énergie & solaire", ex: "Panneaux, bornes de recharge" },
  { icon: IconStore, label: "Retail & encaissement", ex: "TPE, vitrines, signalétique" },
]

function EquipmentCategories() {
  return (
    <section className="lp-section" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="lp-wrap">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <span className="lp-eyebrow">Les secteurs d&apos;activité</span>
          <h2 className="lp-h2" style={{ marginTop: 18 }}>Si c&apos;est un actif physique, ça se finance.</h2>
          <p className="lp-lede" style={{ margin: "16px auto 0", maxWidth: 520 }}>
            Du parc informatique à la machine-outil, Everlease finance tout équipement professionnel — neuf ou déjà acquis.
          </p>
        </div>
        <div className="lp-eqgrid">
          {EQUIPMENT_CATS.map((c, i) => {
            const I = c.icon
            return (
              <div key={i} className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14, transition: "border-color .12s, transform .12s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-soft-2)"; e.currentTarget.style.transform = "translateY(-1px)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <I size={19} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25, marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.ex}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "var(--text-3)" }}>
          … et bien d&apos;autres. <Link href="/auth" style={{ color: "var(--accent)", fontWeight: 500 }}>Vérifiez votre éligibilité en 30 secondes →</Link>
        </div>
      </div>
    </section>
  )
}

/* ---------------- BLOCK 3 — REASSURANCE ---------------- */
function FeatureRow({ num, eyebrow, title, body, bullets, visual, reversed }: {
  num: string
  eyebrow: string
  title: string
  body: string
  bullets?: string[]
  visual: React.ReactNode
  reversed?: boolean
}) {
  return (
    <div className={"lp-row" + (reversed ? " lp-row--rev" : "")} style={{ marginBottom: 96 }}>
      <div className="lp-row__text">
        <div className="lp-feat-num" style={{ marginBottom: 12 }}>{num}</div>
        <div className="lp-kicker" style={{ marginBottom: 12 }}>{eyebrow}</div>
        <h3 className="lp-h2" style={{ fontSize: 30 }}>{title}</h3>
        <p className="lp-lede" style={{ fontSize: 16, marginTop: 16 }}>{body}</p>
        {bullets && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {bullets.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: 99, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                  <IconCheckSm size={11} />
                </div>
                <span style={{ fontSize: 14, color: "var(--text-2)" }}>{b}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>{visual}</div>
    </div>
  )
}

function Reassurance() {
  return (
    <section id="product" className="lp-section">
      <div className="lp-wrap">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 72px" }}>
          <span className="lp-eyebrow">La plateforme</span>
          <h2 className="lp-h2" style={{ marginTop: 18 }}>Le financement d&apos;équipement, enfin à votre main.</h2>
        </div>

        <FeatureRow
          num="01"
          eyebrow="Liberté de choix"
          title="Vous choisissez votre fournisseur. On trouve le bon financement."
          body="Everlease ne vous impose ni matériel, ni vendeur. Vous achetez où vous voulez — Everlease interroge ses partenaires financiers et vous conseille sur l'offre la plus adaptée à vos besoins."
          bullets={[
            "Consultation simultanée de tous nos partenaires",
            "Offres classées par le score Everlease : coût, flexibilité, rapidité",
            "Aucun engagement tant que vous n'avez pas signé",
          ]}
          visual={<VisualMarketplace />}
        />

        <FeatureRow
          num="02"
          eyebrow="Transparence & flexibilité"
          title="Tous vos contrats au même endroit. Et qui s'adaptent."
          body="Fini les e-mails au gestionnaire et les avenants papier. Suivez chaque loyer, chaque échéance, et pilotez vos contrats en autonomie : refinancement, report, suspension ou résiliation anticipée en quelques clics."
          bullets={[
            "Échéanciers, capital restant dû et documents centralisés",
            "Refinancez quand les taux baissent — Everlease vous alerte",
            "Demandes de report ou de résiliation traitées dans l'app",
          ]}
          visual={<VisualContract />}
          reversed
        />

        <FeatureRow
          num="03"
          eyebrow="Scoring augmenté par l'IA"
          title="Un financement qui évolue au rythme de votre entreprise."
          body="Everlease réévalue en continu la santé réelle de votre entreprise et fait grandir votre capacité de financement à mesure que vous performez. Votre enveloppe n'est plus figée une fois par an, elle vit avec vous."
          bullets={[
            "Score Everlease recalculé chaque jour à partir de données réelles",
            "Capacité d'engagement qui augmente avec votre activité",
            "Des conditions qui s'améliorent à mesure que vous prouvez votre solidité",
          ]}
          visual={<VisualScoring />}
        />
      </div>
    </section>
  )
}

/* ---------------- BLOCK 4 — INTEGRATIONS (Hyperline-style) ---------------- */
// Logo grid: 7 cols × 5 rows. Edges empty → impression of many more integrations.
// Filled cells: real logo image on brand-color background.
type IntCell = { img: string; n: string; bg: string; fill?: boolean } | null
const INT_GRID: IntCell[][] = [
  [null, null, null, null, null, null, null],
  [null,
    { img: "/landing/pennylane.png", n: "Pennylane", bg: "#FFFFFF" },
    { img: "/landing/qonto.png", n: "Qonto", bg: "#1D1D1B", fill: true },
    { img: "/landing/sage.svg", n: "Sage", bg: "#00A341", fill: true },
    { img: "/landing/quickbooks.avif", n: "QuickBooks", bg: "#2CA01C", fill: true },
    { img: "/landing/xero.svg", n: "Xero", bg: "#13B5EA", fill: true },
  null],
  [null,
    { img: "/landing/netsuite.svg", n: "NetSuite", bg: "#FFFFFF" },
    { img: "/landing/intuit.png", n: "Intuit", bg: "#FFFFFF" },
    { img: "/landing/freshbooks.png", n: "FreshBooks", bg: "#0F85FF", fill: true },
    { img: "/landing/sellsy.png", n: "Sellsy", bg: "#1A56FF" },
    { img: "/landing/spendesk.png", n: "Spendesk", bg: "#6B21A8", fill: true },
  null],
  [null, null,
    { img: "/landing/expensify.webp", n: "Expensify", bg: "#00C244", fill: true },
    { img: "/landing/zoho-books.png", n: "Zoho Books", bg: "#1A73E8", fill: true },
  null, null, null],
  [null, null, null, null, null, null, null],
]

function IntegrationsBlock() {
  return (
    <section id="accounting" className="lp-section" style={{ padding: 0 }}>
      <div className="lp-wrap">
        <div className="lp-bigplus">
          <div className="lp-bigplus__glow"></div>
          {/* grid texture */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.4, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }}></div>

          <div className="lp-bigplus__head" style={{ position: "relative", textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <span className="lp-eyebrow" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)", color: "#C8C8E8" }}>
              <SparkleGlyph size={12} color="#C8C8E8" /> Intégrations - coming soon
            </span>
            <h2 className="lp-h2" style={{ marginTop: 20, color: "#FAFAF9" }}>Le financement vient à vous.<br/>Plus l&apos;inverse.</h2>
            <p className="lp-lede" style={{ marginTop: 16, color: "rgba(255,255,255,0.66)", maxWidth: 540, margin: "16px auto 0" }}>
              Connectez votre comptabilité et vos comptes bancaires. Everlease détecte les actifs déjà achetés encore éligibles et vous propose le financement — sans que vous ayez à le chercher.
            </p>
            <Link href="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22, fontSize: 14, fontWeight: 500, color: "#FAFAF9" }}>
              Découvrir les intégrations <IconArrowRight size={14} />
            </Link>
          </div>

          {/* Logo grid */}
          <div className="lp-bigplus__logos" style={{ position: "relative", maskImage: "linear-gradient(to bottom, transparent, black 18%, black 100%), linear-gradient(to right, transparent, black 14%, black 86%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 18%, black 100%), linear-gradient(to right, transparent, black 14%, black 86%, transparent)", WebkitMaskComposite: "source-in", maskComposite: "intersect" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720, margin: "0 auto" }}>
              {INT_GRID.map((row, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14 }}>
                  {row.map((cell, ci) => (
                    <div key={ci} style={{
                      aspectRatio: "1", borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: cell ? cell.bg : "rgba(255,255,255,0.015)",
                      display: "grid", placeItems: "center", overflow: "hidden",
                      boxShadow: cell ? "0 6px 18px rgba(0,0,0,0.35)" : "none",
                    }} title={cell ? cell.n : ""}>
                      {cell && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cell.img} alt={cell.n} style={cell.fill
                          ? { width: "100%", height: "100%", objectFit: "cover", display: "block" }
                          : { width: "62%", height: "62%", objectFit: "contain", display: "block" }
                        } />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative", textAlign: "center", padding: "8px 0 48px", fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
            Pennylane · QuickBooks · Sage · Xero · NetSuite · Qonto · Spendesk — et bien d&apos;autres
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- FINAL CTA + FOOTER ---------------- */
function FinalCta({ onOpenExpert }: { onOpenExpert: () => void }) {
  return (
    <section className="lp-section--tight" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="lp-wrap" style={{ textAlign: "center", maxWidth: 640 }}>
        <h2 className="lp-h2">Prêt à financer votre prochain équipement&nbsp;?</h2>
        <p className="lp-lede" style={{ margin: "14px auto 0", maxWidth: 480 }}>
          Déposez un devis, on s&apos;occupe du reste. Mise en place en quelques minutes, fonds débloqués sous 48h.
        </p>
        <div className="lp-cta-row" style={{ marginTop: 28 }}>
          <Link className="btn btn--accent btn--lg" href="/auth">Financer un équipement <IconArrowRight /></Link>
          <button className="btn btn--secondary btn--lg" type="button" onClick={onOpenExpert}>Parler à un expert</button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text-3)" }}>
          <Logo size={20} />
          <span>The new way of financing your equipment.</span>
          <span style={{ marginLeft: "auto" }}>© 2026 Everlease SAS — Tous droits réservés.</span>
          <span>Conçu et hébergé en France 🇫🇷</span>
        </div>
      </div>
    </footer>
  )
}

/* ---------------- EXPERT MODAL ---------------- */
// Mounted only while open, so the form state is fresh on each opening.
function ExpertModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = React.useState(false)
  const [qualif, setQualif] = React.useState<'oui' | 'non' | null>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const submit = (e: React.FormEvent) => { e.preventDefault(); setSent(true) }

  return (
    <div className="lp-modal__scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lp-modal" role="dialog" aria-modal="true">
        {!sent ? (
          <React.Fragment>
            <div className="lp-modal__head">
              <div>
                <div className="lp-modal__title">Parler à un expert Everlease</div>
                <div className="lp-modal__sub">Un conseiller vous rappelle sous 24h ouvrées pour étudier votre projet de financement.</div>
              </div>
              <button className="lp-modal__close" onClick={onClose} aria-label="Fermer"><IconClose size={16} /></button>
            </div>

            <form className="lp-form" onSubmit={submit}>
              <div className="lp-field">
                <label>Entreprise</label>
                <input required placeholder="Nom de votre société" />
              </div>

              <div className="lp-form__row">
                <div className="lp-field">
                  <label>Prénom</label>
                  <input required placeholder="Camille" />
                </div>
                <div className="lp-field">
                  <label>Nom</label>
                  <input required placeholder="Verdier" />
                </div>
              </div>

              <div className="lp-field">
                <label>Rôle dans l&apos;entreprise</label>
                <select required defaultValue="">
                  <option value="" disabled>Sélectionnez votre rôle</option>
                  <option>Dirigeant / Gérant</option>
                  <option>Directeur Financier (DAF)</option>
                  <option>Directeur Général</option>
                  <option>Office Manager</option>
                  <option>Autre</option>
                </select>
              </div>

              <div className="lp-field">
                <label>Avez-vous une première demande de financement à soumettre&nbsp;?</label>
                <div className="lp-seg">
                  <button type="button" aria-pressed={qualif === "oui"} onClick={() => setQualif("oui")}>Oui, j&apos;ai un devis</button>
                  <button type="button" aria-pressed={qualif === "non"} onClick={() => setQualif("non")}>Pas encore</button>
                </div>
              </div>

              <div className="lp-field">
                <label>Email professionnel</label>
                <input required type="email" placeholder="camille@entreprise.fr" />
              </div>

              <div className="lp-field">
                <label>Téléphone</label>
                <input required type="tel" placeholder="06 12 34 56 78" />
              </div>

              <button className="btn btn--accent btn--lg" type="submit">Demander à être rappelé <IconArrowRight /></button>
              <div className="lp-modal__legal">En soumettant, vous acceptez d&apos;être contacté par Everlease. Aucune donnée n&apos;est partagée sans votre accord.</div>
            </form>
          </React.Fragment>
        ) : (
          <div className="lp-modal__done">
            <div className="lp-modal__done-check"><IconCheck size={26} /></div>
            <div className="lp-modal__title">Demande envoyée&nbsp;!</div>
            <div className="lp-modal__sub" style={{ maxWidth: 340, margin: "8px auto 0" }}>
              Un expert Everlease vous recontacte sous 24h ouvrées. Vous pouvez déjà préparer votre devis fournisseur.
            </div>
            <button className="btn btn--accent btn--lg" style={{ width: "100%", justifyContent: "center", marginTop: 22 }} onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- BLOCK — THE PAIN (problem agitation) ---------------- */
const PAINS: { icon: (p: IconProps) => React.JSX.Element; title: string; body: string }[] = [
  {
    icon: IconClock,
    title: "La banque traîne, puis exige.",
    body: "Dossier en comité, allers-retours pendant des semaines — et au bout, un refus ou une caution personnelle. Pendant ce temps, l'équipement attend, et l'activité aussi.",
  },
  {
    icon: IconLock,
    title: "Votre trésorerie reste bloquée.",
    body: "Payer comptant 20, 50 ou 100 k€ de matériel, c'est autant de cash en moins pour les salaires, les stocks et les imprévus du quotidien.",
  },
  {
    icon: IconRefresh,
    title: "Des contrats figés.",
    body: "Impossible de reporter une échéance ou d'ajuster vos loyers quand l'activité ralentit. Vos contrats devraient suivre votre saisonnalité, pas l'inverse.",
  },
]

function PainBlock() {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <span className="lp-eyebrow">Le problème</span>
          <h2 className="lp-h2" style={{ marginTop: 18 }}>Financer un équipement ne devrait pas être un parcours du combattant.</h2>
          <p className="lp-lede" style={{ margin: "16px auto 0", maxWidth: 540 }}>
            Aujourd&apos;hui, équiper son entreprise impose un choix coûteux : vider sa trésorerie, ou affronter le circuit bancaire. Everlease supprime ce dilemme.
          </p>
        </div>
        <div className="lp-painrow">
          {PAINS.map((p, i) => {
            const Ic = p.icon
            return (
              <div key={i} className="lp-paincard">
                <span className="lp-paincard__ic"><Ic size={18} /></span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function LandingPage({ className, userEmail }: { className?: string; userEmail?: string | null }) {
  const [expertOpen, setExpertOpen] = React.useState(false)
  const openExpert = React.useCallback(() => setExpertOpen(true), [])
  const closeExpert = React.useCallback(() => setExpertOpen(false), [])

  return (
    <div className={"lp" + (className ? " " + className : "")}>
      <Nav userEmail={userEmail} />
      <Hero onOpenExpert={openExpert} />
      <PainBlock />
      <TryBlock />
      <EquipmentCategories />
      <Reassurance />
      <IntegrationsBlock />
      <FinalCta onOpenExpert={openExpert} />
      <Footer />
      {expertOpen && <ExpertModal onClose={closeExpert} />}
    </div>
  )
}

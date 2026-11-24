'use client'

// Home everlease « Aurore » — portée du canvas Design « Home everlease ·
// exploration design » (24/11/2026). Le produit est montré sur des scènes en
// dégradé (cobalt, accent clair, crème), la page pose le duo « l'IA lit,
// notre équipe relit », et quatre secteurs sont mis à la une en photo.
//
// Règles de vérité : financeurs désignés par leur type (« Banque », « Loueur
// spécialisé »), jamais nommés ; aucun délai de financement promis (seul
// engagement : rappel sous 24 h ouvrées) ; chaque bloc chiffré porte « Montants
// indicatifs, hors assurance et services. Sous réserve d'acceptation du dossier
// par le financeur. » ; aucun témoignage ni client inventé.
//
// Tout est visible sans JavaScript. Après hydratation, la classe `.js` est
// posée sur `.lp` et un IntersectionObserver ajoute `.in` sur chaque section
// `[data-reveal]`. prefers-reduced-motion saute à l'état final.
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import { BtnGauge } from './Gauge'
import ExpertModal, { type ModalKind } from './ExpertModal'
import { fmt } from './format'
import { IconBank, IconCheck, IconDoc, IconFactory, IconMedical, IconResto, IconShield, IconStore, IconTool, IconUpload, IconUser } from './icons'
import { ASSETS } from './pictos'
import { prefersReducedMotion } from './useInView'
import { HOME_FAQ, HOME_SECTORS } from '@/lib/seo/home'

const LEGAL_AMOUNTS = "Montants indicatifs, hors assurance et services. Sous réserve d'acceptation du dossier par le financeur."

/* ---------------- Titres révélés ligne par ligne ---------------- */
function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l) => (
        <span className="ln" key={l}><span className="ln-i">{l}</span></span>
      ))}
    </>
  )
}

function Check({ off }: { off?: boolean }) {
  return (
    <div className={`chk ${off ? 'no' : 'on'}`} aria-hidden="true">
      {off
        ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 6h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        : <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>
  )
}

// Même devis fictif que sur la page distributeurs.
const QUOTE_LINES = [
  { label: 'Four mixte 10 niveaux', amount: 16900, ok: true },
  { label: 'Chambre froide positive', amount: 11200, ok: true },
  { label: 'Lave-vaisselle à capot', amount: 6284, ok: true },
  { label: 'Caisse tactile et PC de gestion', amount: 2890, ok: true },
  { label: 'Tables et chaises de salle', amount: 4000, ok: true },
  { label: 'Installation et mise en service', amount: 1600, ok: false },
]
const FINANCEABLE = QUOTE_LINES.filter((l) => l.ok).reduce((sum, l) => sum + l.amount, 0)
const QUOTE_TOTAL = QUOTE_LINES.reduce((sum, l) => sum + l.amount, 0)

/* ---------------- HERO ---------------- */
function Hero({ onOpenExpert }: { onOpenExpert: () => void }) {
  return (
    <header id="hero" className="hm-hero" data-reveal="now">
      <div className="wrap">
        <div className="hm-hero__head">
          <div className="kicker fade">Financement locatif d&apos;équipements professionnels</div>
          <h1 className="display h1">
            <Lines lines={['Payez vos équipements', 'au rythme de votre activité.']} />
          </h1>
          <p className="lede fade d1">Déposez un devis. everlease le lit ligne à ligne, notre équipe vérifie le montage, puis votre dossier est présenté aux financeurs adaptés.</p>
          <div className="cta-row fade d2">
            <Link className="btn btn--primary" href="/auth"><BtnGauge />Déposer un devis</Link>
            <button className="btn btn--ghost" type="button" onClick={onOpenExpert}>Parler à un expert</button>
          </div>
          <div className="products fade d3">
            <span>Location financière <i /></span>
            <span>Crédit-bail <i /></span>
            <span>LLD <i /></span>
            <span>LOA <i /></span>
            <span>Lease-back</span>
          </div>
        </div>

        <div className="stage stage--hero hm-stage fade d2" aria-label="Aperçu d'un dossier everlease">
          <div className="hm-stage__col">
            <div className="hm-card float">
              <div className="hm-card__k">Votre devis</div>
              <div className="hm-file">
                <span className="hm-tile"><IconDoc size={18} /></span>
                <div><div className="hm-file__n">devis-cuisine.pdf</div><div className="hm-file__s">6 lignes · {fmt(QUOTE_TOTAL)}&nbsp;€ HT</div></div>
              </div>
              <span className="tag tag--ok" style={{ marginTop: 12 }}>Lecture terminée</span>
            </div>
            <div className="hm-card float">
              <div className="hm-file">
                <Image className="hm-avatar" src="/landing/equipe.jpg" alt="Une conseillère everlease au téléphone" width={44} height={44} />
                <div><div className="hm-file__n">Vérifié par notre équipe</div><div className="hm-file__s">Location financière</div><div className="hm-file__s">48 mois</div></div>
              </div>
              <p className="hm-quote">«&nbsp;J&apos;ai analysé votre demande et votre société. Vous êtes éligible au financement auprès de plusieurs de nos partenaires.&nbsp;»</p>
            </div>
          </div>

          <div className="hm-doc float">
            <div className="hm-doc__head">
              <div className="doc__title">Devis n°&nbsp;2026-0417 · Cuisine de restaurant</div>
              <div className="small muted">Lu ligne à ligne · montants HT</div>
            </div>
            <div className="hm-doc__rows">
              {QUOTE_LINES.map((l) => (
                <div className={`hm-line${l.ok ? '' : ' off'}`} key={l.label}>
                  <Check off={!l.ok} />
                  <span className="hm-line__l">{l.label}</span>
                  <span className="hm-line__a">{fmt(l.amount)}&nbsp;€</span>
                </div>
              ))}
            </div>
            <div className="hm-doc__foot">
              <span className="hm-card__k">Total finançable</span>
              <span className="hm-doc__total">{fmt(FINANCEABLE)}&nbsp;€</span>
            </div>
          </div>

          <div className="hm-stage__col">
            <div className="hm-card float">
              <div className="hm-card__k">Loyer estimé</div>
              <div className="hm-rent"><b>{fmt(982)}&nbsp;€</b><span>/ mois</span></div>
              <div className="hm-bars" aria-hidden="true" />
              <div className="hm-bars__axis"><span>M01</span><span>M48</span></div>
              <div className="hm-file__s" style={{ marginTop: 8 }}>48 loyers, hors assurance et services.</div>
            </div>
            <div className="hm-card float">
              <div className="hm-card__k">Réponses des financeurs</div>
              <div className="hm-answers">
                <div className="hm-answer"><span className="hm-tile hm-tile--sm"><IconBank size={14} /></span><span className="hm-answer__n">Banque</span><span className="tag tag--accent">Reçue</span></div>
                <div className="hm-answer"><span className="hm-tile hm-tile--sm"><IconTool size={14} /></span><span className="hm-answer__n">Loueur spécialisé</span><span className="tag tag--accent">Reçue</span></div>
              </div>
            </div>
          </div>
        </div>
        <p className="legal hm-stage__legal">{LEGAL_AMOUNTS}</p>
      </div>
    </header>
  )
}

/* ---------------- BANDE DE RÉASSURANCE ---------------- */
function Strip() {
  return (
    <section className="hm-strip" aria-label="Ce qui ne change pas">
      <div className="wrap hm-strip__in">
        <div><IconDoc size={18} /><div><b>Un devis suffit</b><span>Vous gardez votre fournisseur et votre matériel.</span></div></div>
        <div><IconUser size={18} /><div><b>Notre équipe relit chaque dossier</b><span>Rien ne part chez un financeur sans relecture.</span></div></div>
        <div><IconBank size={18} /><div><b>Des financeurs adaptés</b><span>Banques et loueurs spécialisés, selon votre projet.</span></div></div>
        <div><IconCheck size={18} /><div><b>Vous décidez</b><span>Vous comparez les réponses reçues, sans engagement.</span></div></div>
      </div>
    </section>
  )
}

/* ---------------- L'IA ET L'ÉQUIPE (bloc sombre) ---------------- */
function Duo() {
  return (
    <section className="hm-duo" data-reveal>
      <div className="wrap hm-duo__grid">
        <div>
          <div className="kicker fade">La technologie et le métier</div>
          <h2 className="display h2" style={{ marginTop: 14 }}>
            <Lines lines={["L'IA lit chaque ligne.", 'Notre équipe relit chaque dossier.']} />
          </h2>
          <p className="lede fade d1" style={{ marginTop: 20, maxWidth: 460, fontSize: 17 }}>La machine fait ce qui prend du temps. L&apos;équipe fait ce qui demande du jugement. Vous avez les deux, sur le même dossier.</p>
        </div>
        <div className="hm-duo__cols fade d2">
          <div>
            <div className="hm-duo__lbl hm-duo__lbl--ai">Ce que fait l&apos;IA</div>
            <div className="hm-duo__row"><b>Elle lit le devis.</b><span>Chaque ligne, chaque quantité, chaque montant HT.</span></div>
            <div className="hm-duo__row"><b>Elle trie ce qui est finançable.</b><span>Le matériel d&apos;un côté, l&apos;installation et les services de l&apos;autre.</span></div>
            <div className="hm-duo__row"><b>Elle prépare le dossier.</b><span>Données d&apos;entreprise, pièces, montage proposé.</span></div>
          </div>
          <div>
            <div className="hm-duo__lbl">Ce que fait notre équipe</div>
            <div className="hm-duo__row"><b>Elle vérifie le montage.</b><span>Location financière, crédit-bail, lease-back&nbsp;: le bon produit pour votre projet.</span></div>
            <div className="hm-duo__row"><b>Elle choisit à qui présenter.</b><span>Les financeurs dont les critères correspondent à votre dossier.</span></div>
            <div className="hm-duo__row"><b>Elle vous rappelle.</b><span>Sous 24&nbsp;h ouvrées, pour vous dire où en est votre dossier.</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- COMMENT ÇA MARCHE ---------------- */
function HowItWorks() {
  return (
    <section id="comment" className="sec" data-reveal>
      <div className="wrap">
        <div className="hm-head">
          <div>
            <div className="kicker fade">Comment ça marche</div>
            <h2 className="display h2" style={{ marginTop: 14 }}><Lines lines={['Trois étapes, un seul dossier.']} /></h2>
          </div>
          <p className="lede fade d1" style={{ maxWidth: 420, fontSize: 17 }}>Du devis à la réponse des financeurs, vous suivez le même dossier, au même endroit.</p>
        </div>

        <ol className="hm-steps">
          <li className="fade d1">
            <div className="stage stage--soft hm-step__stage">
              <div className="hm-card float">
                <div className="hm-drop">
                  <IconUpload size={22} />
                  <b>Glissez un devis ou une facture</b>
                  <span>PDF, JPG ou PNG</span>
                </div>
                <div className="hm-answer" style={{ marginTop: 12 }}><IconDoc size={18} /><span className="hm-answer__n">devis-cuisine.pdf<small>Lecture en cours</small></span></div>
              </div>
            </div>
            <div className="hm-step__n">01</div>
            <h3>Vous déposez votre devis.</h3>
            <p>Un PDF ou une photo suffit. Vous gardez votre fournisseur, votre matériel et le prix que vous avez négocié.</p>
          </li>
          <li className="fade d2">
            <div className="stage stage--dark hm-step__stage">
              <div className="hm-doc float">
                <div className="hm-doc__head"><div className="doc__title" style={{ fontSize: 18 }}>Fiche dossier</div></div>
                <div className="hm-doc__rows">
                  <div className="hm-line"><span className="hm-line__l">Identité et ancienneté</span><span className="tag tag--ok">Vérifiées</span></div>
                  <div className="hm-line"><span className="hm-line__l">Devis lu ligne à ligne</span><span className="tag tag--ok">5 sur 6</span></div>
                  <div className="hm-line"><span className="hm-line__l">Pièces réunies</span><span className="tag tag--ok">3 / 3</span></div>
                </div>
                <div className="hm-doc__foot hm-doc__foot--note">
                  <Image className="hm-avatar hm-avatar--sm" src="/landing/equipe.jpg" alt="" width={36} height={36} />
                  <div><b>Notre équipe</b><span>«&nbsp;Montage vérifié. Votre dossier est prêt à être présenté.&nbsp;»</span></div>
                </div>
              </div>
            </div>
            <div className="hm-step__n">02</div>
            <h3>Nous préparons le dossier.</h3>
            <p>Vous voyez ce qui est regardé, les financeurs aussi. Notre équipe relit le tout avant toute présentation.</p>
          </li>
          <li className="fade d3">
            <div className="stage stage--vivid hm-step__stage">
              <div className="hm-card float">
                <div className="doc__title" style={{ fontSize: 18 }}>Réponses reçues</div>
                <div className="hm-answers" style={{ marginTop: 14 }}>
                  <div className="hm-answer hm-answer--on"><span className="hm-tile hm-tile--md"><IconBank size={16} /></span><span className="hm-answer__n">Banque<small>48 mois</small></span><span className="hm-answer__v">{fmt(982)}&nbsp;€ / mois</span></div>
                  <div className="hm-answer"><span className="hm-tile hm-tile--md"><IconTool size={16} /></span><span className="hm-answer__n">Loueur spécialisé<small>48 mois</small></span><span className="hm-answer__v">{fmt(1004)}&nbsp;€ / mois</span></div>
                  <div className="hm-answer"><span className="hm-tile hm-tile--md"><IconStore size={16} /></span><span className="hm-answer__n">Loueur indépendant<small>Étude en cours</small></span><span className="tag">En cours</span></div>
                </div>
              </div>
            </div>
            <div className="hm-step__n">03</div>
            <h3>Les financeurs répondent, vous décidez.</h3>
            <p>Votre dossier est présenté aux financeurs adaptés. Vous comparez les réponses reçues et vous choisissez.</p>
          </li>
        </ol>
        <p className="legal" style={{ margin: '28px 0 0' }}>Montants indicatifs, hors assurance et services. La décision et les conditions restent celles du financeur.</p>
      </div>
    </section>
  )
}

/* ---------------- SECTEURS À LA UNE ---------------- */
const SECTOR_ICONS = { resto: IconResto, medical: IconMedical, shield: IconShield, factory: IconFactory }

function Sectors() {
  return (
    <section id="cats" className="sec hm-band" data-reveal>
      <div className="wrap">
        <div className="hm-head">
          <div>
            <div className="kicker fade">Pour ceux qui équipent leur métier</div>
            <h2 className="display hm-h2 fade d1" style={{ marginTop: 14, maxWidth: 900 }}>Une cuisine, un atelier, un cabinet&nbsp;: des matériels différents qui méritent le bon financement.</h2>
          </div>
          <Link className="hm-more fade d1" href="/secteurs">Voir tous les secteurs →</Link>
        </div>

        <div className="hm-sectors fade d2">
          {HOME_SECTORS.map((s) => {
            const Ico = SECTOR_ICONS[s.icon]
            return (
              <Link className="hm-sector" href={`/secteurs/${s.slug}`} key={s.slug}>
                <span className="hm-sector__img">
                  <Image src={s.img} alt={s.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 1080px) 50vw, 300px" style={{ objectFit: 'cover', objectPosition: s.pos }} />
                </span>
                <span className="hm-sector__cap">
                  <Ico size={22} />
                  <span className="hm-sector__n">{s.lines[0]}<br />{s.lines[1]}</span>
                  <span className="hm-sector__go">Voir →</span>
                </span>
              </Link>
            )
          })}
        </div>

        <div className="ledger">
          {ASSETS.map((a, i) => (
            <div className="item" key={a.name}>
              <div className="idx">{String(i + 1 + HOME_SECTORS.length).padStart(2, '0')}</div>
              {a.pic}
              <div><div className="nm">{a.name}</div><div className="ex">{a.ex}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- FOURNISSEURS ET DISTRIBUTEURS ---------------- */
function Partners({ onOpenFunder }: { onOpenFunder: () => void }) {
  return (
    <section id="partners" className="hm-dist" data-reveal>
      <div className="wrap">
        <div className="stage stage--soft hm-dist__in">
          <div>
            <div className="kicker fade">Fournisseurs et distributeurs</div>
            <h2 className="display hm-h2 fade d1" style={{ marginTop: 14 }}>
              <span style={{ display: 'block' }}>Vous vendez des équipements&nbsp;?</span>
              <span style={{ display: 'block' }}>Proposez une mensualité à vos clients.</span>
            </h2>
            <p className="lede fade d2" style={{ fontSize: 17, marginTop: 14, maxWidth: 560 }}>Vos commerciaux transmettent le devis, everlease monte le dossier de financement et le présente aux financeurs adaptés.</p>
          </div>
          <Link className="btn btn--ink fade d2" href="/distributeurs">Découvrir l&apos;offre distributeurs</Link>
        </div>
        <p id="financeurs" className="hm-funders small">Vous êtes financeur&nbsp;? Recevez des dossiers prêts à instruire. <button type="button" onClick={onOpenFunder}>Échanger avec nous →</button></p>
      </div>
    </section>
  )
}

/* ---------------- QUESTIONS FRÉQUENTES ---------------- */
function Questions() {
  return (
    <section id="questions" className="sec" data-reveal>
      <div className="wrap">
        <div className="dist-faq">
          <div>
            <div className="kicker fade">Questions fréquentes</div>
            <h2 className="display h2 fade d1" style={{ marginTop: 14 }}>Ce qu&apos;on nous demande avant de déposer un devis.</h2>
          </div>
          <div className="dist-faq__rows fade d1">
            {HOME_FAQ.map((f) => (
              <div className="dist-faq__row" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- CTA FINAL ---------------- */
function FinalCta({ onOpenExpert }: { onOpenExpert: () => void }) {
  return (
    <section id="final" className="hm-final" data-reveal>
      <div className="wrap">
        <div className="stage stage--dark hm-final__in">
          <h2 className="display hm-final__t">
            <Lines lines={['Quel est votre', 'prochain équipement ?']} />
          </h2>
          <div>
            <div className="cta-row fade d1" style={{ marginTop: 0 }}>
              <Link className="btn btn--light" href="/auth">Déposer un devis</Link>
              <button className="btn btn--outline-light" type="button" onClick={onOpenExpert}>Parler à un expert</button>
            </div>
            <p className="small fade d2" style={{ margin: '16px 0 0', color: 'var(--dark-muted)' }}>Notre équipe vous rappelle sous 24&nbsp;h ouvrées. Sous réserve d&apos;acceptation du dossier par le financeur.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- PAGE ---------------- */
export default function LandingPage() {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [modal, setModal] = React.useState<ModalKind | null>(null)
  const openExpert = React.useCallback(() => setModal('expert'), [])
  const openFunder = React.useCallback(() => setModal('funder'), [])
  const closeModal = React.useCallback(() => setModal(null), [])

  // `.js` doit être peint avant que le hero reçoive `.in`, sinon le titre ne
  // part pas de sa position masquée : useLayoutEffect pose `.js` sur le DOM
  // avant le premier paint hydraté, le rAF suivant révèle le hero.
  React.useLayoutEffect(() => {
    rootRef.current?.classList.add('js')
  }, [])

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('in')
            io.unobserve(en.target)
          }
        }
      },
      { threshold: 0.12 },
    )
    let raf = 0
    targets.forEach((t) => {
      if (t.dataset.reveal === 'now') raf = requestAnimationFrame(() => t.classList.add('in'))
      else io.observe(t)
    })
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={rootRef} className="lp" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingNav />
      <Hero onOpenExpert={openExpert} />
      <Strip />
      <Duo />
      <HowItWorks />
      <Sectors />
      <Partners onOpenFunder={openFunder} />
      <Questions />
      <FinalCta onOpenExpert={openExpert} />
      <MarketingFooter />
      {modal && <ExpertModal kind={modal} onClose={closeModal} />}
    </div>
  )
}

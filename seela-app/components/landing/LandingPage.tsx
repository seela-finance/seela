'use client'

// Landing everlease v2 — portée du canvas Design « Refonte landing everlease »
// (Main.dc.html). Thème : une grosse dépense devient un flux régulier.
// Règles de vérité : financeurs anonymes, aucun délai de financement promis,
// pas de score live ni d'open banking, chaque chiffre est un « Exemple
// illustratif » « hors assurance et services », chaque bloc chiffré se ferme
// par « Sous réserve d'acceptation du dossier par le financeur. ».
//
// Tout est visible sans JavaScript. Après hydratation, la classe `.js` est
// posée sur `.lp` et un IntersectionObserver (seuil 0,18, une seule fois)
// ajoute `.in` sur chaque section `[data-reveal]` : titres révélés ligne par
// ligne, fondus, pictogrammes et arcs tracés. prefers-reduced-motion saute
// directement à l'état final. Aucune bibliothèque d'animation.
import React from 'react'
import Link from 'next/link'
import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'
import { BtnGauge, Gauge } from './Gauge'
import SignatureBars from './SignatureBars'
import QuoteReader from './QuoteReader'
import DossierFlow from './DossierFlow'
import ExpertModal, { type ModalKind } from './ExpertModal'
import { ASSETS } from './pictos'
import { prefersReducedMotion } from './useInView'

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

/* ---------------- HERO ---------------- */
function Hero({ onOpenExpert }: { onOpenExpert: () => void }) {
  return (
    <header id="hero" className="hero" data-reveal="now">
      <div className="wrap">
        <div className="hero__grid">
          <div>
            <h1 className="display h1">
              <Lines lines={['Payez vos équipements', 'au rythme de', 'votre activité.']} />
            </h1>
            <p className="lede hero__sub fade d1">Déposez un devis. Everlease prépare votre dossier et le présente aux financeurs adaptés à votre projet&nbsp;: banques et loueurs spécialisés.</p>
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
          <aside className="hero__aside fade d2" aria-label="Ce qu'everlease fait">
            <div><strong>Un seul dossier</strong>Un devis ou une facture suffit pour commencer. Vous gardez votre fournisseur et votre matériel.</div>
            <div><strong>Lu par l&apos;IA, vérifié par un expert</strong>Le document est lu ligne à ligne, le montage est vérifié avant toute présentation.</div>
            <div><strong>Présenté aux financeurs adaptés</strong>Banques et loueurs spécialisés étudient votre dossier. Vous comparez les réponses et vous décidez.</div>
            <p className="legal" style={{ margin: '6px 0 0' }}>Sous réserve d&apos;acceptation du dossier par le financeur.</p>
          </aside>
        </div>
      </div>
    </header>
  )
}

/* ---------------- LE PROBLÈME ---------------- */
function Problem() {
  return (
    <section id="problem" className="sec" data-reveal>
      <div className="wrap">
        <div className="kicker fade">Le problème</div>
        <h2 className="display h2" style={{ marginTop: 14, maxWidth: 900 }}>
          <Lines lines={['Équiper son entreprise', 'ne devrait pas vider sa trésorerie.']} />
        </h2>
        <div className="prob">
          <div className="fade d1">
            <div className="n">01</div>
            <h3>Une seule proposition sur la table.</h3>
            <p>Celle de votre banque ou de votre fournisseur, sans point de comparaison.</p>
          </div>
          <div className="fade d2">
            <div className="n">02</div>
            <h3>Du cash immobilisé.</h3>
            <p>20, 50 ou 100&nbsp;k€ de matériel, c&apos;est autant de moins pour les salaires, les stocks et les imprévus.</p>
          </div>
          <div className="fade d3">
            <div className="n">03</div>
            <h3>Un dossier chronophage.</h3>
            <p>Des pièces à rassembler, des interlocuteurs à relancer, des contrats difficiles à lire.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- DÉMONSTRATION : LECTURE DU DEVIS ---------------- */
function Demo() {
  return (
    <section id="demo" className="sec demo" data-reveal>
      <div className="wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="kicker fade">Démonstration</div>
            <h2 className="display h2" style={{ marginTop: 14 }}>
              <Lines lines={['Un devis suffit', 'pour commencer.']} />
            </h2>
          </div>
          <span className="tag tag--accent fade d1">Exemple illustratif</span>
        </div>
        <QuoteReader />
      </div>
    </section>
  )
}

/* ---------------- COMMENT ÇA MARCHE + TRAJET DU DOSSIER ---------------- */
function HowItWorks() {
  return (
    <section id="comment" className="sec" data-reveal>
      <div className="wrap">
        <div className="kicker fade">Comment ça marche</div>
        <h2 className="display h2" style={{ marginTop: 14, maxWidth: 820 }}>
          <Lines lines={['Trois étapes,', 'un seul dossier.']} />
        </h2>
        <div className="how__grid">
          <ol className="steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li className="step fade d1">
              <div className="num">01</div>
              <div><h3>Vous déposez votre devis.</h3><p>Vous gardez votre fournisseur et votre matériel.</p></div>
            </li>
            <li className="step fade d2">
              <div className="num">02</div>
              <div><h3>Nous préparons le dossier.</h3><p>L&apos;IA lit les documents et un expert vérifie le montage adapté.</p></div>
            </li>
            <li className="step fade d3">
              <div className="num">03</div>
              <div><h3>Nous le présentons aux financeurs adaptés.</h3><p>Vous comparez les réponses reçues et vous décidez.</p></div>
            </li>
          </ol>
          <DossierFlow />
        </div>
      </div>
    </section>
  )
}

/* ---------------- UN SCORING PROPRE ET CONTINU ---------------- */
function Suivi() {
  return (
    <section id="suivi" className="sec" style={{ borderTop: '1px solid var(--line)' }} data-reveal>
      <div className="wrap">
        <div className="kicker fade">Un scoring propre et continu</div>
        <h2 className="display h2" style={{ marginTop: 14, maxWidth: 820 }}>
          <Lines lines={['Votre financement', 'suit votre situation.']} />
        </h2>
        <div className="suivi__grid">
          <div>
            <p className="lede fade d1">Chaque dossier est qualifié avec les mêmes critères, lisibles et vérifiés par un expert. Et il ne s&apos;arrête pas à la première demande&nbsp;: à chaque nouveau projet, il est réévalué sur votre situation du moment.</p>
            <div className="pts fade d2" style={{ marginTop: 28 }}>
              <div><b>Des critères lisibles</b><p>Identité, ancienneté, forme juridique, pièces, actif financé. Vous voyez ce qui est regardé, les financeurs aussi.</p></div>
              <div><b>Vérifié par un expert</b><p>L&apos;IA prépare, un conseiller valide avant toute présentation. Rien ne part sans relecture.</p></div>
              <div><b>Réévalué à chaque demande</b><p>Votre dossier évolue avec votre activité. Un nouveau projet repart de votre situation à jour, pas de celle d&apos;il y a deux ans.</p></div>
            </div>
            <p className="legal fade d3" style={{ margin: '18px 0 0' }}>Everlease qualifie et présente le dossier. La décision et les conditions restent celles du financeur.</p>
          </div>
          <div className="fiche fade d2" aria-label="Fiche dossier d'exemple">
            <div className="fiche__head">
              <div>
                <div className="doc__title">Fiche dossier</div>
                <div className="small muted">SAS fictive · Restauration · deuxième demande</div>
              </div>
              <span className="tag tag--accent">Exemple illustratif</span>
            </div>
            <div className="crit"><div><div className="k">Identité et ancienneté</div><div className="d">Registre national des entreprises</div></div><span className="v">Vérifiées</span></div>
            <div className="crit"><div><div className="k">Forme juridique et dirigeant</div><div className="d">Statuts, représentant légal</div></div><span className="v">Vérifiés</span></div>
            <div className="crit"><div><div className="k">Devis lu ligne à ligne</div><div className="d">5 lignes finançables sur 6, installation écartée</div></div><span className="v">41&nbsp;274 € HT</span></div>
            <div className="crit"><div><div className="k">Pièces réunies</div><div className="d">Kbis, dernier bilan, pièce d&apos;identité</div></div><span className="v">3 / 3</span></div>
            <div className="crit"><div><div className="k">Montage proposé</div><div className="d">Vérifié par un expert everlease</div></div><span className="v neu">Location financière · 48 mois</span></div>
            <div className="fiche__foot">
              <Gauge value={0.833} />
              <div>
                <div style={{ fontWeight: 600 }}>Prêt à présenter</div>
                <div className="small muted" style={{ marginTop: 2 }}>Mis à jour à la demande du 12 mai. Réévalué à votre prochain projet, sur votre situation du moment.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- TOUT ACTIF PROFESSIONNEL ---------------- */
function AssetLedger() {
  return (
    <section id="cats" className="sec" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }} data-reveal>
      <div className="wrap">
        <div className="cats__head">
          <div>
            <div className="kicker fade">Tout actif professionnel</div>
            <h2 className="display h2" style={{ marginTop: 14 }}>
              <Lines lines={["Si c'est un actif professionnel,", 'parlons-en.']} />
            </h2>
          </div>
          <p className="lede fade d1" style={{ fontSize: 17 }}>Neuf ou déjà acquis. Un équipement, une flotte, un agencement complet. Les catégories ci-dessous sont des repères, pas une limite.</p>
        </div>
        <div className="ledger">
          {ASSETS.map((a, i) => (
            <div className="item" key={a.name}>
              <div className="idx">{String(i + 1).padStart(2, '0')}</div>
              {a.pic}
              <div><div className="nm">{a.name}</div><div className="ex">{a.ex}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- QUEL FINANCEMENT CHOISIR ---------------- */
const COMPARE: { slug: string; name: string; desc: string; option: string; optionYes?: boolean; services: string; servicesYes?: boolean }[] = [
  { slug: 'location-financiere', name: 'Location financière', desc: "Vous louez, sans option d'achat.", option: 'Non', services: 'Selon contrat' },
  { slug: 'credit-bail', name: 'Crédit-bail', desc: "Vous louez avec une option d'achat en fin de contrat.", option: 'Oui', optionYes: true, services: 'Selon contrat' },
  { slug: 'lld', name: 'LLD', desc: 'Une location longue durée, souvent avec des services.', option: 'Non', services: 'Souvent', servicesYes: true },
  { slug: 'loa', name: 'LOA', desc: "Une location avec option d'achat.", option: 'Oui', optionYes: true, services: 'Selon contrat' },
  { slug: 'leaseback', name: 'Lease-back', desc: 'Vous vendez un matériel déjà acheté et vous le louez pour libérer de la trésorerie.', option: 'Selon montage', services: 'Selon contrat' },
]

function CompareRows() {
  return (
    <section id="compare" className="sec" data-reveal>
      <div className="wrap">
        <div className="kicker fade">Quel financement choisir</div>
        <h2 className="display h2" style={{ marginTop: 14, maxWidth: 820 }}>
          <Lines lines={['Cinq façons de louer,', 'une seule à choisir.']} />
        </h2>
        <div className="cmp fade d1">
          <div className="cmp__row head"><div>Produit</div><div>En une phrase</div><div>Option d&apos;achat</div><div>Services inclus</div><div /></div>
          {COMPARE.map((c) => (
            <Link className="cmp__row" href={`/solutions/${c.slug}`} key={c.slug}>
              <div className="cmp__name">{c.name}</div>
              <div className="cmp__desc">{c.desc}</div>
              <div className={c.optionYes ? 'cmp__v yes' : 'cmp__v'}><i />{c.option}</div>
              <div className={c.servicesYes ? 'cmp__v yes' : 'cmp__v'}><i />{c.services}</div>
              <div className="cmp__go" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            </Link>
          ))}
        </div>
        <p className="legal fade d2" style={{ margin: '16px 0 0' }}>Chaque produit a ses conditions, fixées par le financeur. Sous réserve d&apos;acceptation du dossier par le financeur.</p>
      </div>
    </section>
  )
}

/* ---------------- FOURNISSEURS ET DISTRIBUTEURS ---------------- */
function Partners({ onOpen }: { onOpen: () => void }) {
  return (
    <section id="partners" className="partners" data-reveal>
      <div className="wrap">
        <div className="partners__in">
          <div>
            <div className="kicker fade">Fournisseurs et distributeurs</div>
            <h2 className="display h3 fade d1" style={{ marginTop: 12, fontSize: 'clamp(24px, 2.6vw, 34px)' }}>Vous vendez des équipements&nbsp;? Proposez une mensualité à vos clients.</h2>
            <p className="lede fade d2" style={{ fontSize: 16, marginTop: 10, maxWidth: 640 }}>Votre client garde son devis, vous gardez votre vente&nbsp;: everlease prépare le dossier de financement et le présente aux financeurs adaptés.</p>
          </div>
          <button className="btn btn--ink fade d2" type="button" onClick={onOpen}>Nous contacter</button>
        </div>
      </div>
    </section>
  )
}

/* ---------------- POUR LES FINANCEURS (bande sombre) ---------------- */
function FundersBand({ onOpen }: { onOpen: () => void }) {
  return (
    <section id="financeurs" className="funders" data-reveal>
      <div className="wrap">
        <div className="funders__grid">
          <div>
            <div className="kicker fade">Pour les financeurs</div>
            <h2 className="display h2 funders__title" style={{ marginTop: 14 }}>
              <Lines lines={['Vous êtes financeur ?', 'Recevez des dossiers prêts à instruire.']} />
            </h2>
            <p className="lede fade d1" style={{ marginTop: 20, maxWidth: 460, fontSize: 17 }}>Nous apportons des dossiers, pas des classements. Vous instruisez, vous décidez, à vos conditions.</p>
            <div className="cta-row fade d2" style={{ marginTop: 28 }}>
              <button className="btn btn--light" type="button" onClick={onOpen}>Échanger avec nous</button>
            </div>
          </div>
          <div className="ready fade d2">
            <div><span className="n">01</span><div><b>Devis ou facture lus ligne à ligne</b><span className="t">Actif, quantités, montants HT, part finançable identifiée, installation et services écartés.</span></div></div>
            <div><span className="n">02</span><div><b>Données d&apos;entreprise vérifiées</b><span className="t">Identité, ancienneté, forme juridique, dirigeant, pièces réunies avant transmission.</span></div></div>
            <div><span className="n">03</span><div><b>Un interlocuteur, un dossier</b><span className="t">Un expert everlease qualifie le montage et suit le client jusqu&apos;à la signature.</span></div></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- CTA FINAL ---------------- */
function FinalCta({ onOpenExpert }: { onOpenExpert: () => void }) {
  return (
    <section id="final" className="final" data-reveal>
      <div className="wrap">
        <div className="final__in">
          <div>
            <h2 className="display h1" style={{ fontSize: 'clamp(36px, 5.4vw, 76px)' }}>
              <Lines lines={['Quel est votre', 'prochain équipement ?']} />
            </h2>
          </div>
          <div>
            <div className="cta-row fade d1" style={{ marginTop: 0 }}>
              <Link className="btn btn--primary" href="/auth"><BtnGauge />Déposer un devis</Link>
              <button className="btn btn--ghost" type="button" onClick={onOpenExpert}>Parler à un expert</button>
            </div>
            <p className="small fade d2" style={{ margin: '16px 0 0', color: 'var(--ink-2)' }}>Un conseiller vous rappelle sous 24&nbsp;h ouvrées.</p>
            <p className="legal fade d2" style={{ margin: '6px 0 0' }}>Sous réserve d&apos;acceptation du dossier par le financeur.</p>
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
  const openPartner = React.useCallback(() => setModal('partner'), [])
  const openFunder = React.useCallback(() => setModal('funder'), [])
  const closeModal = React.useCallback(() => setModal(null), [])

  // `.js` doit être peint avant que le hero reçoive `.in`, sinon le titre ne
  // part pas de sa position masquée : useLayoutEffect pose `.js` sur le DOM
  // avant le premier paint hydraté, le rAF suivant révèle le hero. La classe
  // est ajoutée hors React (className reste « lp ») : rien à réconcilier.
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
      { threshold: 0.18 },
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
      <SignatureBars />
      <Problem />
      <Demo />
      <HowItWorks />
      <Suivi />
      <AssetLedger />
      <CompareRows />
      <Partners onOpen={openPartner} />
      <FundersBand onOpen={openFunder} />
      <FinalCta onOpenExpert={openExpert} />
      <MarketingFooter />
      {modal && <ExpertModal kind={modal} onClose={closeModal} />}
    </div>
  )
}

'use client'

// Page /distributeurs — portée du canvas Design « Page distributeurs
// everlease ». Trois arguments : moins d'administratif pour les commerciaux,
// plus d'acceptation, un dispositif sur mesure (présenté comme un service à
// la demande, jamais comme une intégration livrée).
//
// Design « Aurore » (24/11/2026) : les visuels produit sont posés sur des
// scènes en dégradé, le bloc « Pour commencer » est une scène sombre. Le
// constat reste un bloc sombre à plat (décision de Louis du 17/11/2026).
//
// Règles de vérité : financeurs désignés par leur type, jamais nommés ; aucun
// délai de financement promis ; chaque bloc chiffré porte « Montants
// indicatifs, hors assurance et services. Sous réserve d'acceptation du
// dossier par le financeur. ».
//
// Tout est visible sans JavaScript. Après hydratation, la classe `.js` est
// posée sur le `.lp` du layout marketing et un IntersectionObserver révèle
// chaque section `[data-reveal]`, comme sur la landing.
import React from 'react'
import { BtnGauge, Gauge } from '@/components/landing/Gauge'
import ExpertModal from '@/components/landing/ExpertModal'
import { fmt } from '@/components/landing/format'
import { IconBank, IconCheck, IconCheckSm, IconDoc, IconLink, IconList, IconTool, IconUser } from '@/components/landing/icons'
import { prefersReducedMotion } from '@/components/landing/useInView'
import { DISTRIBUTORS_FAQ } from '@/lib/seo/distributors'
import { CONTACT_EMAIL } from '@/lib/seo/site'

const QUOTE_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Devis test distributeur')}`

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l) => (
        <span className="ln" key={l}><span className="ln-i">{l}</span></span>
      ))}
    </>
  )
}

const LEGAL = "Sous réserve d'acceptation du dossier par le financeur."

/* ---------------- HERO ---------------- */
function Hero({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="hero dist-hero" data-reveal="now">
      <div className="wrap">
        <div className="hero__grid">
          <div>
            <div className="kicker fade">Fournisseurs et distributeurs</div>
            <h1 className="display h1">
              <Lines lines={['Vos commerciaux vendent.', 'Nous montons le financement.']} />
            </h1>
            <p className="lede hero__sub fade d1">Everlease lit le devis, prépare le dossier et le présente aux financeurs adaptés. Vos clients paient en loyers, vous êtes réglé à la livraison.</p>
            <div className="cta-row fade d2">
              <button className="btn btn--primary" type="button" onClick={onOpen}><BtnGauge />Présenter votre circuit de vente</button>
              <a className="btn btn--ghost" href={QUOTE_MAILTO}>Envoyer un devis test</a>
            </div>
            <ul className="dist-trust fade d3">
              <li><IconCheck size={14} />Sans exclusivité</li>
              <li><IconCheck size={14} />Sans engagement</li>
              <li><IconCheck size={14} />Sans frais pour vous</li>
            </ul>
          </div>
          <aside className="fade d2" aria-label="Ce que change everlease pour votre équipe">
            <div className="dist-pillars">
              <a href="#administratif">
                <span className="n">01</span>
                <span><b>Moins d&apos;administratif</b><span className="t">Votre commercial transmet le devis. Nous préparons le dossier, réunissons les pièces et relançons.</span></span>
              </a>
              <a href="#acceptation">
                <span className="n">02</span>
                <span><b>Plus de dossiers acceptés</b><span className="t">Un dossier qualifié avant d&apos;être présenté, puis proposé à plusieurs financeurs.</span></span>
              </a>
              <a href="#sur-mesure">
                <span className="n">03</span>
                <span><b>Un dispositif à votre mesure</b><span className="t">Offres par gamme, loyers sur vos devis, branchement à vos outils&nbsp;: mis en place avec votre équipe.</span></span>
              </a>
            </div>
            <p className="legal" style={{ margin: '14px 0 0' }}>{LEGAL}</p>
          </aside>
        </div>
      </div>
    </header>
  )
}

/* ---------------- LE CONSTAT (bloc sombre) ---------------- */
function Constat() {
  return (
    <section className="sec dist-constat" data-reveal>
      <div className="wrap">
        <div className="kicker fade">Le constat</div>
        <h2 className="display h2" style={{ marginTop: 14, maxWidth: 900 }}>
          <Lines lines={['Le financement prend du temps', 'à ceux qui vendent.']} />
        </h2>
        <div className="prob">
          <div className="fade d1">
            <div className="n">01</div>
            <h3>Un extranet par loueur.</h3>
            <p>Vos commerciaux ressaisissent le devis, réclament les pièces et relancent. Ce temps n&apos;est pas passé à vendre.</p>
          </div>
          <div className="fade d2">
            <div className="n">02</div>
            <h3>Des refus qui arrivent tard.</h3>
            <p>Le client a dit oui, le loueur dit non. La vente est perdue et le commercial ne propose plus le financement.</p>
          </div>
          <div className="fade d3">
            <div className="n">03</div>
            <h3>Une offre standard.</h3>
            <p>Le même barème pour toutes vos gammes, un parcours qui ne ressemble pas à votre façon de vendre.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 01 · MOINS D'ADMINISTRATIF ---------------- */
const TASKS = [
  { t: 'Le devis', before: "Ressaisi sur l'extranet de chaque loueur.", after: 'Transmis tel quel. Nous le lisons ligne à ligne.' },
  { t: 'Les pièces du client', before: "Kbis, bilan, pièce d'identité : à réclamer, puis à relancer.", after: 'Nous les demandons au client, une seule fois.' },
  { t: 'Les relances', before: 'Le client, le loueur, puis le client à nouveau.', after: 'Nous relançons. Votre commercial est tenu informé.' },
  { t: 'Le contrat', before: 'À expliquer au client et à faire signer.', after: "Nous accompagnons votre client jusqu'à la signature." },
]

// Même devis fictif que la démonstration de la landing (QuoteReader).
const QUOTE_LINES = [
  { label: 'Four mixte 10 niveaux × 1', sub: 'Cuisson', amount: 16900, ok: true },
  { label: 'Chambre froide positive × 1', sub: 'Froid', amount: 11200, ok: true },
  { label: 'Lave-vaisselle à capot × 1', sub: 'Plonge', amount: 6284, ok: true },
  { label: 'Caisse tactile et PC de gestion × 1', sub: 'Informatique', amount: 2890, ok: true },
  { label: 'Tables et chaises de salle × 26', sub: 'Mobilier', amount: 4000, ok: true },
  { label: 'Installation et mise en service', sub: 'Prestation de service · écartée du financement', amount: 1600, ok: false },
]
const FINANCEABLE = QUOTE_LINES.filter((l) => l.ok).reduce((sum, l) => sum + l.amount, 0)
const QUOTE_TOTAL = QUOTE_LINES.reduce((sum, l) => sum + l.amount, 0)
const RENT = 982

function LessAdmin() {
  return (
    <section id="administratif" className="sec dist-sec dist-band" data-reveal>
      <div className="wrap">
        <div className="dist-head">
          <div className="kicker fade">01 · Moins d&apos;administratif</div>
          <h2 className="display h2">
            <Lines lines={['Un devis transmis,', "rien d'autre à faire."]} />
          </h2>
          <p className="lede fade d1">Votre commercial envoie le devis tel qu&apos;il est. Everlease le lit ligne à ligne, isole ce qui est finançable et prend le dossier en charge jusqu&apos;à la signature.</p>
        </div>
        <div className="dist-grid">
          <div className="dist-cmp fade d1">
            <div className="dist-cmp__head"><span>Aujourd&apos;hui</span><span>Avec everlease</span></div>
            {TASKS.map((r) => (
              <div className="dist-cmp__row" key={r.t}>
                <h3>{r.t}</h3>
                <div className="dist-cmp__cols">
                  <p className="was">{r.before}</p>
                  <p>{r.after}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="stage stage--hero dist-stage fade d2">
          <div className="doc dist-doc float" aria-label="Devis d'exemple lu ligne par ligne">
            <div className="doc__head">
              <div>
                <div className="doc__title">Devis n°&nbsp;2026-0417 · Cuisine de restaurant</div>
                <div className="small muted">Émis par vous · 6 lignes · HT</div>
              </div>
              <div className="dist-tags">
                <span className="tag tag--ok">Lecture terminée</span>
              </div>
            </div>
            {QUOTE_LINES.map((l) => (
              <div key={l.label} className={`row ${l.ok ? 'lit' : 'off'}`}>
                <div className={`chk ${l.ok ? 'on' : 'no'}`} aria-hidden="true">
                  {l.ok
                    ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                </div>
                <div>
                  <div className="lbl">{l.label}</div>
                  <div className="sub">{l.sub}</div>
                </div>
                <div className={`amt${l.ok ? '' : ' strike'}`}>{fmt(l.amount)}&nbsp;€</div>
              </div>
            ))}
            <div className="dist-doc__foot">
              <div>
                <div className="kicker">Total finançable</div>
                <div className="total__num mono">{fmt(FINANCEABLE)}&nbsp;€</div>
                <div className="small" style={{ marginTop: 8, color: 'var(--ink-2)' }}>5 lignes retenues sur 6 · installation écartée</div>
              </div>
              <div>
                <div className="rent"><span className="muted">environ</span><b>{fmt(RENT)}&nbsp;€</b><span className="muted">/ mois sur 48 mois</span></div>
                <p className="legal">Montants indicatifs, hors assurance et services. {LEGAL}</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 02 · PLUS D'ACCEPTATION ---------------- */
function MoreAcceptance() {
  return (
    <section id="acceptation" className="sec dist-sec" data-reveal>
      <div className="wrap">
        <div className="dist-head">
          <div className="kicker fade">02 · Plus d&apos;acceptation</div>
          <h2 className="display h2">
            <Lines lines={['Moins de refus,', 'plus de ventes conclues.']} />
          </h2>
          <p className="lede fade d1">Un refus tardif coûte une vente et la confiance de votre commercial dans le financement. Nous traitons les deux causes&nbsp;: un dossier présenté trop tôt, et à un seul financeur.</p>
        </div>
        <div className="dist-grid dist-grid--rev">
          <div className="stage stage--vivid dist-stage fade d1">
          <div className="fiche dist-track float" aria-label="Suivi d'un dossier d'exemple">
            <div className="fiche__head">
              <div>
                <div className="doc__title">Suivi du dossier</div>
                <div className="small muted">Ce que voit votre commercial</div>
              </div>
            </div>
            <div className="dist-step">
              <span className="dist-mark done" aria-hidden="true"><IconCheckSm size={12} /></span>
              <div><div className="k">Devis reçu</div><div className="d">Transmis par votre commercial</div></div>
              <span className="tag tag--ok">Fait</span>
            </div>
            <div className="dist-step">
              <span className="dist-mark done" aria-hidden="true"><IconCheckSm size={12} /></span>
              <div><div className="k">Dossier qualifié</div><div className="d">5 lignes finançables sur 6, pièces réunies, montage vérifié par notre équipe</div></div>
              <span className="tag tag--ok">Finançable</span>
            </div>
            <div className="dist-step">
              <span className="dist-mark done" aria-hidden="true"><IconCheckSm size={12} /></span>
              <div>
                <div className="k">Présenté aux financeurs</div>
                <div className="dist-fins">
                  <div className="dist-fin"><span className="dist-fin__n"><IconBank size={14} />Banque</span><span className="tag tag--accent">Réponse reçue</span></div>
                  <div className="dist-fin"><span className="dist-fin__n"><IconTool size={14} />Loueur spécialisé</span><span className="tag tag--accent">Réponse reçue</span></div>
                </div>
              </div>
            </div>
            <div className="dist-step">
              <span className="dist-mark now" aria-hidden="true"><i /></span>
              <div><div className="k">Choix du client</div><div className="d">Votre client compare les réponses et décide</div></div>
              <span className="tag">En cours</span>
            </div>
            <div className="dist-step next">
              <span className="dist-mark" aria-hidden="true" />
              <div><div className="k">Livraison et règlement</div><div className="d">Vous livrez, le financeur vous règle</div></div>
              <span className="tag">À venir</span>
            </div>
            <div className="dist-track__foot">
              <Gauge value={0.7} />
              <div>
                <div style={{ fontWeight: 600 }}>Votre commercial sait où en est le dossier.</div>
                <div className="small" style={{ marginTop: 2, color: 'var(--ink-2)' }}>Un point d&apos;avancement à chaque étape, sans avoir à appeler. {LEGAL}</div>
              </div>
            </div>
          </div>
          </div>
          <div className="fade d2">
            <div className="dist-pts">
              <div><h3>Qualifié avant d&apos;être présenté.</h3><p>Nous indiquons ce qui est finançable dès la lecture du devis. Votre commercial ne promet rien qu&apos;il ne pourra pas tenir.</p></div>
              <div><h3>Présenté à plusieurs financeurs.</h3><p>Banques et loueurs spécialisés. Un refus chez l&apos;un n&apos;arrête pas le dossier.</p></div>
              <div><h3>Un parcours court pour votre client.</h3><p>Une mensualité dès le devis, un rappel par un conseiller sous 24&nbsp;h ouvrées, des pièces demandées une seule fois.</p></div>
              <div><h3>Un suivi visible.</h3><p>Chaque étape est signalée à votre commercial. En cas de refus, nous regardons ce qui peut être ajusté&nbsp;: durée, périmètre, autre financeur.</p></div>
            </div>
            <p className="legal" style={{ margin: '16px 0 0' }}>Everlease qualifie et présente le dossier. La décision et les conditions restent celles du financeur.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- 03 · SUR MESURE ---------------- */
function Tailored() {
  return (
    <section id="sur-mesure" className="sec dist-sec dist-band" data-reveal>
      <div className="wrap">
        <div className="dist-head">
          <div className="kicker fade">03 · Sur mesure</div>
          <h2 className="display h2">
            <Lines lines={['Un dispositif construit', 'autour de votre vente.']} />
          </h2>
          <p className="lede fade d1">Chaque distributeur vend à sa façon. Nous adaptons le financement à vos gammes, à vos outils et à votre équipe. Nous le mettons en place avec vous, à la demande.</p>
        </div>
        <div className="dist-grid dist-grid--rev">
          <div className="dist-mods fade d1">
            <div className="dist-mod">
              <IconList size={22} />
              <h3>Des offres à vos gammes</h3>
              <p>Packs matériel et services, durées, loyers par gamme. Vos commerciaux présentent une mensualité, pas seulement un prix.</p>
              <span className="tag">À la demande</span>
            </div>
            <div className="dist-mod">
              <IconDoc size={22} />
              <h3>Le loyer sur vos devis</h3>
              <p>Une grille de loyers à intégrer à vos devis&nbsp;: la mensualité s&apos;affiche à côté du prix comptant.</p>
              <span className="tag">À la demande</span>
            </div>
            <div className="dist-mod">
              <IconLink size={22} />
              <h3>Vos outils connectés</h3>
              <p>Les dossiers partent de votre CRM ou de votre ERP, le suivi y revient. Nous étudions le branchement avec votre équipe.</p>
              <span className="tag">Sur étude</span>
            </div>
            <div className="dist-mod">
              <IconUser size={22} />
              <h3>Vos commerciaux accompagnés</h3>
              <p>Un argumentaire par gamme, une prise en main avec l&apos;équipe, un interlocuteur unique pour tous vos dossiers.</p>
              <span className="tag">À la demande</span>
            </div>
            <p className="dist-mods__note">Rien n&apos;est imposé. Vous commencez par un devis, nous ajoutons le reste quand cela a du sens pour votre équipe.</p>
          </div>
          <div className="stage stage--soft dist-stage fade d2">
          <div className="dist-quote float" aria-label="Exemple de devis à votre marque avec le loyer affiché">
            <div className="dist-quote__head">
              <div className="dist-quote__id">
                <div className="dist-logo">Votre logo</div>
                <div><div style={{ fontSize: 15, fontWeight: 600 }}>Votre devis</div><div className="legal">n°&nbsp;2026-0417</div></div>
              </div>
            </div>
            <div className="dist-quote__lines">
              <div><span>Équipements de cuisine et de salle</span><span className="amt">{fmt(FINANCEABLE)}&nbsp;€</span></div>
              <div><span>Installation et mise en service</span><span className="amt">{fmt(QUOTE_TOTAL - FINANCEABLE)}&nbsp;€</span></div>
              <div><span>Total HT</span><span className="amt">{fmt(QUOTE_TOTAL)}&nbsp;€</span></div>
            </div>
            <div className="dist-rent">
              <div className="k">Ou en location</div>
              <div className="v"><b>{fmt(RENT)}&nbsp;€</b><span>HT / mois sur 48 mois</span></div>
              <div className="s">Pour les équipements. L&apos;installation reste réglée au comptant.</div>
            </div>
            <p className="legal">Montants indicatifs, hors assurance et services. {LEGAL}</p>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- QUESTIONS FRÉQUENTES ---------------- */
function Questions({ onOpen }: { onOpen: () => void }) {
  return (
    <section id="questions" className="sec dist-sec" data-reveal>
      <div className="wrap">
        <div className="dist-faq">
          <div>
            <div className="kicker fade">Questions fréquentes</div>
            <h2 className="display h2" style={{ marginTop: 14 }}>
              <Lines lines={['Ce que demandent', 'les directions commerciales.']} />
            </h2>
            <div className="cta-row fade d1">
              <button className="btn btn--ghost" type="button" onClick={onOpen}>Poser une autre question</button>
            </div>
          </div>
          <div className="dist-faq__rows fade d1">
            {DISTRIBUTORS_FAQ.map((f) => (
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

/* ---------------- POUR COMMENCER (bloc sombre) ---------------- */
function Start({ onOpen }: { onOpen: () => void }) {
  return (
    <section id="contact" className="funders funders--stage dist-sec" data-reveal>
      <div className="wrap">
        <div className="funders__grid">
          <div>
            <div className="kicker fade">Pour commencer</div>
            <h2 className="display h2 funders__title" style={{ marginTop: 14 }}>
              <Lines lines={['Trente minutes pour regarder', 'votre circuit de vente.']} />
            </h2>
            <p className="lede fade d1" style={{ marginTop: 20, maxWidth: 460, fontSize: 17 }}>Aucun contrat à signer pour essayer&nbsp;: le premier dossier fait office de test.</p>
            <div className="cta-row fade d2">
              <button className="btn btn--light" type="button" onClick={onOpen}>Présenter votre circuit de vente</button>
              <a className="btn btn--outline-light" href={QUOTE_MAILTO}>Envoyer un devis test</a>
            </div>
            <p className="small fade d2" style={{ margin: '16px 0 0', color: 'var(--dark-muted)' }}>Notre équipe vous rappelle sous 24&nbsp;h ouvrées.</p>
          </div>
          <div className="fade d2">
            <div className="ready">
              <div><span className="n">01</span><div><b>Nous regardons votre circuit de vente.</b><span className="t">Vos gammes, vos outils, la façon dont vos commerciaux vendent aujourd&apos;hui.</span></div></div>
              <div><span className="n">02</span><div><b>Vous nous transmettez un premier devis.</b><span className="t">Nous vous disons ce qui est finançable, puis nous rappelons votre client.</span></div></div>
              <div><span className="n">03</span><div><b>Nous adaptons le dispositif.</b><span className="t">Offres par gamme, loyers sur vos devis, outils&nbsp;: dans l&apos;ordre qui a du sens pour votre équipe.</span></div></div>
            </div>
            <p className="legal" style={{ margin: '16px 0 0', color: 'var(--dark-muted)' }}>{LEGAL}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- PAGE ---------------- */
export default function DistributorsView() {
  const rootRef = React.useRef<HTMLElement>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const openModal = React.useCallback(() => setModalOpen(true), [])
  const closeModal = React.useCallback(() => setModalOpen(false), [])

  // `.js` vit sur le `.lp` du layout marketing (partagé) : posée avant le
  // premier paint hydraté, retirée en quittant la page.
  React.useLayoutEffect(() => {
    const lp = rootRef.current?.closest('.lp')
    lp?.classList.add('js')
    return () => lp?.classList.remove('js')
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
    <main ref={rootRef}>
      <Hero onOpen={openModal} />
      <Constat />
      <LessAdmin />
      <MoreAcceptance />
      <Tailored />
      <Questions onOpen={openModal} />
      <Start onOpen={openModal} />
      {modalOpen && <ExpertModal kind="partner" title="Présenter votre circuit de vente" onClose={closeModal} />}
    </main>
  )
}

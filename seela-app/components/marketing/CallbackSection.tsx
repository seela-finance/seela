// Bloc de fin des pages marketing : une scène sombre « Aurore » avec, à
// gauche, le message et le lien pour déposer un devis, à droite le
// formulaire de rappel. L'ancre `#rappel`, portée par le formulaire, est la
// cible du bouton « Parler à un expert » des hero.
import Link from 'next/link'
import { IconArrowRight, IconCheck } from '@/components/landing/icons'
import CallbackForm from './CallbackForm'

export default function CallbackSection({
  title,
  lede,
  origine,
  cta = 'Déposer un devis',
  flush = false,
}: {
  title: string
  lede: string
  /** D'où vient la demande, tel que l'équipe le lira : « Page solution · Crédit-bail ». */
  origine: string
  cta?: string
  /** Sans marge haute (pages hub, où le bloc ouvre sa section). */
  flush?: boolean
}) {
  return (
    <div className="stage stage--dark mk-callback" style={flush ? { marginTop: 0 } : undefined}>
      <div>
        <div className="kicker">Être rappelé</div>
        <h2 className="display hm-h2">{title}</h2>
        <p className="lede">{lede}</p>
        <ul className="mk-callback__pts">
          <li><IconCheck size={16} />Notre équipe vous rappelle sous 24&nbsp;h ouvrées</li>
          <li><IconCheck size={16} />Un seul dossier, présenté aux financeurs adaptés</li>
        </ul>
        <div className="cta-row">
          <Link className="btn btn--light" href="/auth">{cta} <IconArrowRight /></Link>
        </div>
        <p className="mk-legal">Sous réserve d&apos;acceptation du dossier par le financeur.</p>
      </div>
      <CallbackForm origine={origine} />
    </div>
  )
}

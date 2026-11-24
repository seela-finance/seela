// Content model for the "money" pillar pages — the head-term landing pages that
// target the broad, high-value transactional queries ("financement matériel
// pro", "leasing équipement pro", "courtier financement matériel pro"). They
// sit at the top of the silo and distribute authority to the Solutions,
// Secteurs, Métiers and Blog pages via heavy internal linking.
//
// Rendered by components/marketing/PillarView.tsx. Reuses the block prose
// system (ArticleBlock + ProseBlocks) for the body.

import type { ArticleBlock } from './blog'
import type { Faq } from './solutions'

export type ValueProp = { title: string; body: string }

export type Pillar = {
  /** Top-level URL path, e.g. "financement-materiel-professionnel". */
  slug: string
  metaTitle: string
  metaDescription: string
  kicker: string
  h1: string
  /** Answer-first standfirst under the H1 (GEO extract). */
  standfirst: string
  valueProps: ValueProp[]
  body: ArticleBlock[]
  /** Render the grid linking to every Solution page. */
  showSolutions: boolean
  /** Render the teaser linking to Secteurs + Métiers hubs. */
  showAudiences: boolean
  faq: Faq[]
  /** Cross-links to the other pillars / key pages. */
  related: { label: string; href: string }[]
}

export const PILLARS: Pillar[] = [
  {
    slug: 'financement-materiel-professionnel',
    metaTitle: 'Financement de matériel professionnel',
    metaDescription:
      "Financez le matériel de votre entreprise sans apport : location financière, crédit-bail, LLD, lease-back. everlease présente un seul dossier à des financeurs adaptés. Estimation en ligne.",
    kicker: 'Financement professionnel',
    h1: 'Le financement de matériel professionnel',
    standfirst:
      "Le financement de matériel professionnel permet à une entreprise d'acquérir l'usage d'un équipement (informatique, machine, véhicule, mobilier) contre un loyer mensuel déductible, sans mobiliser sa trésorerie ni, le plus souvent, d'apport. everlease prépare un seul dossier et le présente à plusieurs financeurs adaptés à votre projet.",
    valueProps: [
      { title: 'Un seul dossier', body: "Vous déposez votre devis une fois. everlease structure le dossier et le présente à des financeurs adaptés à votre projet." },
      { title: 'Sans apport', body: "Le financement locatif couvre jusqu'à 100 % de la valeur du matériel, en loyers mensuels déductibles de votre résultat." },
      { title: 'Votre trésorerie préservée', body: "Vous étalez l'investissement au lieu de l'immobiliser, et vous gardez votre capacité d'emprunt bancaire." },
      { title: 'Un conseiller', body: "Un conseiller everlease vous rappelle sous 24 h ouvrées pour cadrer votre projet. Aucune carte ni RIB demandé." },
    ],
    body: [
      { type: 'h2', text: 'Qu’est-ce que le financement de matériel professionnel ?' },
      { type: 'p', text: "Financer son matériel, c’est payer son **usage** dans le temps plutôt que l’acheter comptant. Un organisme financeur achète l’équipement que vous avez choisi et vous le loue sur une durée déterminée (24 à 60 mois) contre un loyer mensuel. Selon la formule, vous pouvez devenir propriétaire au terme (crédit-bail) ou simplement renouveler le matériel (location, LLD)." },
      { type: 'h2', text: 'Les solutions de financement' },
      { type: 'p', text: "Il existe plusieurs formes de financement locatif, chacune adaptée à un type de besoin : la [location financière](/solutions/location-financiere) pour le matériel qui se renouvelle, le [crédit-bail](/solutions/credit-bail) pour devenir propriétaire, la [LLD](/solutions/lld) pour un loyer tout compris, le [lease-back](/solutions/leaseback) pour transformer un matériel déjà acheté en trésorerie. Notre [comparatif des solutions](/solutions) les met face à face." },
      { type: 'h2', text: 'Comment ça se passe avec everlease' },
      { type: 'p', text: "everlease n’est pas un financeur : c’est votre **intermédiaire**. Vous déposez votre devis, nous extrayons les lignes à financer, nous structurons le dossier et nous le présentons à des financeurs adaptés. Vous recevez des propositions indicatives, puis un conseiller vous accompagne jusqu’à la mise en place. On vous explique le rôle du [courtier en financement](/courtier-financement-equipement-professionnel) en détail." },
      { type: 'callout', title: 'Quel matériel peut-on financer ?', text: "En règle générale, tout **actif physique professionnel** à usage durable : informatique et parc IT, machines-outils et équipements industriels, véhicules utilitaires, matériel médical, mobilier et agencement, cuisine professionnelle, équipement de sport… Les prestations de service pures ne sont en général pas finançables." },
    ],
    showSolutions: true,
    showAudiences: true,
    faq: [
      { q: 'Peut-on financer du matériel professionnel sans apport ?', a: "Oui. Le financement locatif (location financière, crédit-bail, LLD) couvre jusqu’à 100 % de la valeur de l’équipement, sans apport initial, ce qui préserve votre trésorerie." },
      { q: 'Quelle différence entre acheter et financer son matériel ?', a: "Acheter comptant immobilise votre trésorerie et vous rend propriétaire immédiatement. Financer étale le coût en loyers déductibles et préserve votre capacité d’emprunt ; selon la formule, vous devenez propriétaire au terme (crédit-bail) ou vous renouvelez le matériel (location, LLD)." },
      { q: 'Les loyers sont-ils déductibles ?', a: "Oui. Les loyers de financement locatif sont considérés comme des charges d’exploitation et sont déductibles du résultat imposable, dans les conditions prévues par la réglementation." },
      { q: 'everlease est-il un financeur ?', a: "Non. everlease est un intermédiaire en financement : nous préparons votre dossier et le présentons à des financeurs partenaires adaptés à votre projet. Ce sont eux qui octroient le financement et fixent leurs conditions." },
    ],
    related: [
      { label: 'Leasing de matériel professionnel', href: '/leasing-materiel-professionnel' },
      { label: 'Courtier en financement d’équipement', href: '/courtier-financement-equipement-professionnel' },
      { label: 'Comparer les solutions', href: '/solutions' },
    ],
  },
  {
    slug: 'leasing-materiel-professionnel',
    metaTitle: 'Leasing de matériel & équipement professionnel',
    metaDescription:
      "Le leasing de matériel professionnel en clair : location financière, crédit-bail et LLD comparés. Financez votre équipement sans apport, en loyers déductibles. Estimation en ligne.",
    kicker: 'Leasing professionnel',
    h1: 'Le leasing de matériel et d’équipement professionnel',
    standfirst:
      "Le leasing professionnel regroupe les formes de location de matériel d'entreprise : location financière, crédit-bail et location longue durée (LLD). Dans tous les cas, un financeur achète l'équipement et vous le loue contre un loyer mensuel déductible, sans apport. La bonne formule dépend de la durée de vie du matériel et de votre intention de le garder ou non.",
    valueProps: [
      { title: 'Location financière', body: "Location pure, sans option d’achat réglementée. Idéale pour le matériel qui se renouvelle vite (informatique, télécom)." },
      { title: 'Crédit-bail', body: "Avec option d’achat : vous pouvez devenir propriétaire au terme. Pour le matériel durable que vous gardez." },
      { title: 'LLD', body: "Loyer tout compris, maintenance incluse. Pour une flotte ou un équipement très sollicité." },
    ],
    body: [
      { type: 'h2', text: 'Leasing, crédit-bail, location : de quoi parle-t-on ?' },
      { type: 'p', text: "« Leasing » est le terme courant pour le **financement locatif** de matériel professionnel. Il recouvre trois formules proches mais distinctes. Le point commun : vous ne décaissez pas le prix d’achat, vous payez un loyer mensuel déductible." },
      {
        type: 'table',
        caption: 'Les trois formes de leasing professionnel',
        head: ['Formule', 'Fin de contrat', 'Idéal pour'],
        rows: [
          ['[Location financière](/solutions/location-financiere)', 'Restitution ou rachat libre', 'Informatique, matériel à renouveler'],
          ['[Crédit-bail](/solutions/credit-bail)', 'Option d’achat → propriété', 'Machine, matériel médical, durable'],
          ['[LLD](/solutions/lld)', 'Restitution, maintenance incluse', 'Flotte, équipement à entretenir'],
        ],
      },
      { type: 'h2', text: 'Leasing ou achat : comment choisir ?' },
      { type: 'p', text: "L’achat comptant vous rend propriétaire tout de suite mais immobilise votre trésorerie. Le leasing étale le coût, préserve votre capacité d’emprunt et garde votre matériel à jour. Pour aller plus loin, lisez notre guide [acheter ou louer son équipement](/blog/credit-bail-ou-lld-differences-comment-choisir)." },
      { type: 'callout', title: 'Quel équipement financer en leasing ?', text: "Informatique et parc IT, machines-outils, véhicules utilitaires, matériel médical, cuisine professionnelle, équipement de sport, mobilier et agencement… tout actif physique professionnel à usage durable." },
    ],
    showSolutions: true,
    showAudiences: true,
    faq: [
      { q: 'Quelle différence entre leasing et crédit-bail ?', a: "Le crédit-bail est une forme de leasing : c’est un leasing avec option d’achat réglementée qui vous permet de devenir propriétaire au terme. Les autres formes de leasing (location financière, LLD) sont des locations sans option d’achat réglementée." },
      { q: 'Le leasing professionnel nécessite-t-il un apport ?', a: "Non, en règle générale. Le leasing finance jusqu’à 100 % de la valeur de l’équipement, sans apport initial." },
      { q: 'Le leasing est-il déductible fiscalement ?', a: "Oui. Les loyers de leasing sont des charges d’exploitation déductibles du résultat imposable, dans les conditions prévues par la réglementation." },
      { q: 'Quelle durée de leasing choisir ?', a: "En général 24 à 60 mois, à caler sur la durée de vie du matériel. Une durée plus longue réduit le loyer mensuel ; une durée plus courte réduit le coût total." },
    ],
    related: [
      { label: 'Financement de matériel professionnel', href: '/financement-materiel-professionnel' },
      { label: 'Crédit-bail ou LLD : comment choisir', href: '/blog/credit-bail-ou-lld-differences-comment-choisir' },
      { label: 'Comparer les solutions', href: '/solutions' },
    ],
  },
  {
    slug: 'courtier-financement-equipement-professionnel',
    metaTitle: 'Courtier en financement de matériel professionnel',
    metaDescription:
      "everlease, votre courtier en financement de matériel professionnel : un seul dossier présenté à plusieurs financeurs adaptés. Location financière, crédit-bail, LLD, lease-back. Estimation en ligne.",
    kicker: 'Courtier en financement',
    h1: 'Votre courtier en financement de matériel professionnel',
    standfirst:
      "Un courtier en financement d'équipement est un intermédiaire qui prépare votre dossier et le présente à plusieurs financeurs à votre place, au lieu de les démarcher un par un. everlease joue ce rôle : vous déposez votre devis une fois, nous structurons le dossier et le présentons à des financeurs adaptés à votre projet.",
    valueProps: [
      { title: 'Un seul interlocuteur', body: "Vous ne contactez pas chaque organisme un par un. everlease centralise votre demande et vous accompagne de bout en bout." },
      { title: 'Plusieurs financeurs', body: "Votre dossier est présenté à des financeurs adaptés à votre matériel et à votre profil, au lieu d’un seul guichet." },
      { title: 'Un dossier bien préparé', body: "Un dossier structuré et complet est mieux compris par les financeurs. Nous le préparons avec vous." },
    ],
    body: [
      { type: 'h2', text: 'Qu’est-ce qu’un courtier en financement d’équipement ?' },
      { type: 'p', text: "Un courtier en financement professionnel est un **intermédiaire** entre votre entreprise et les organismes financeurs (banques, sociétés de crédit-bail, loueurs). Plutôt que de démarcher chaque financeur vous-même, vous confiez votre projet au courtier, qui prépare le dossier et le présente aux acteurs adaptés." },
      { type: 'h2', text: 'Pourquoi passer par un courtier plutôt que votre banque ?' },
      { type: 'ul', items: [
        "Vous gagnez du temps : un seul dossier au lieu de plusieurs démarches en parallèle.",
        "Votre demande est présentée à plusieurs financeurs, pas à un seul guichet.",
        "Le dossier est structuré pour être compris rapidement par les financeurs.",
        "Vous gardez votre relation bancaire et votre capacité d’emprunt pour d’autres besoins.",
      ] },
      { type: 'h2', text: 'Comment everlease travaille' },
      { type: 'p', text: "Vous déposez votre devis, notre analyse en extrait les lignes à financer, puis nous préparons le dossier et le présentons à des financeurs adaptés. Vous recevez des propositions indicatives et un conseiller vous accompagne jusqu’à la mise en place. Les financeurs restent seuls décideurs de l’acceptation et des conditions." },
      { type: 'callout', title: 'Pour quel matériel ?', text: "everlease intervient sur le financement de tout actif physique professionnel : [informatique](/metiers/garage-automobile), machines, véhicules, [matériel médical](/secteurs/sante-cabinets-medicaux), [équipement CHR](/secteurs/chr-hotellerie-restauration), [sport](/secteurs/salles-de-sport-fitness) et plus. Découvrez le financement [par secteur](/secteurs) ou [par métier](/metiers)." },
    ],
    showSolutions: true,
    showAudiences: true,
    faq: [
      { q: 'Qu’est-ce qu’un courtier en financement de matériel professionnel ?', a: "C’est un intermédiaire qui prépare votre dossier de financement et le présente à plusieurs organismes financeurs à votre place, au lieu que vous les démarchiez un par un. everlease joue ce rôle pour le financement d’équipement professionnel." },
      { q: 'everlease prête-t-il l’argent ?', a: "Non. everlease est un intermédiaire : nous présentons votre dossier à des financeurs partenaires. Ce sont eux qui octroient le financement et fixent leurs conditions." },
      { q: 'Quels financeurs sont sollicités ?', a: "Des financeurs adaptés à votre matériel et à votre profil (sociétés de crédit-bail, loueurs, banques partenaires). Votre dossier est présenté à ceux qui correspondent le mieux à votre projet." },
      { q: 'Comment démarrer ?', a: "Déposez votre devis en ligne. Nous en extrayons les lignes à financer, préparons le dossier et vous recevez des propositions indicatives. Un conseiller vous rappelle sous 24 h ouvrées. Aucune carte ni RIB demandé." },
    ],
    related: [
      { label: 'Financement de matériel professionnel', href: '/financement-materiel-professionnel' },
      { label: 'Leasing de matériel professionnel', href: '/leasing-materiel-professionnel' },
      { label: 'Comment ça marche', href: '/#comment' },
    ],
  },
]

export function getPillar(slug: string): Pillar | undefined {
  return PILLARS.find((p) => p.slug === slug)
}

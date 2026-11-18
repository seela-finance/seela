// Content model for the editorial "Blog" / "Ressources" SEO pages. Mirrors the
// data-driven approach of solutions.ts / sectors.ts: one object per article,
// rendered identically by components/marketing/ArticleView.tsx so the SEO/GEO
// structure (H1/H2, answer-first intro, FAQ schema, internal links) stays
// consistent while the content stays genuinely differentiated — never thin or
// templated doorway pages.
//
// HUMAN REVIEW GATE: only articles with `published: true` are rendered,
// listed on the hub, included in generateStaticParams and in the sitemap.
// A draft (`published: false`) is never exposed — nothing AI-written reaches
// the public site without being flipped to published by a human.
//
// Inline links: paragraph and list text supports a minimal Markdown link
// syntax `[label](/path)` — ArticleView parses it and renders a crawlable
// <Link> for internal paths (starting with "/") or an <a> for external URLs.
// This is what carries the contextual in-body internal linking (maillage).

import type { Faq } from './solutions'

export type Pillar = {
  slug: string
  /** Short label (nav, tags). */
  name: string
  /** Hub section heading. */
  title: string
  /** Hub section intro. */
  description: string
}

export type ArticleBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'callout'; title?: string; text: string }
  | { type: 'table'; caption?: string; head: string[]; rows: string[][] }

export type Article = {
  slug: string
  pillarSlug: string
  /** Short label used in cards / related lists. */
  nav: string
  /** H1 / display title. */
  title: string
  metaTitle: string
  metaDescription: string
  /** One-sentence hub excerpt. */
  excerpt: string
  /** Hero eyebrow label. */
  kicker: string
  /** ISO dates (YYYY-MM-DD). */
  datePublished: string
  dateModified: string
  /** Estimated reading time in minutes. */
  readingMinutes: number
  /** Answer-first standfirst shown under the H1 (the GEO extract). */
  standfirst: string
  body: ArticleBlock[]
  faq: Faq[]
  /** Internal linking targets. */
  relatedSolutions: string[]
  relatedSectors: string[]
  relatedArticles: string[]
  /** HUMAN REVIEW GATE — false = draft, never rendered or indexed. */
  published: boolean
}

export const PILLARS: Pillar[] = [
  {
    slug: 'comprendre-comparer',
    name: 'Comprendre & comparer',
    title: 'Comprendre et comparer les financements',
    description:
      "Crédit-bail, LLD, location financière, lease-back : les différences, les avantages et comment choisir la bonne formule pour votre équipement.",
  },
  {
    slug: 'financer-par-equipement',
    name: 'Financer un équipement',
    title: 'Financer un type d’équipement',
    description:
      "Informatique, machine-outil, véhicule utilitaire, matériel médical ou de cuisine : comment financer concrètement chaque type de matériel professionnel.",
  },
  {
    slug: 'pratique-decision',
    name: 'Guides pratiques',
    title: 'Guides pratiques et décision',
    description:
      "Durée, comptabilité, TVA, matériel d’occasion, financement sans apport, étapes d’un dossier : les réponses concrètes avant de vous lancer.",
  },
]

export const ARTICLES: Article[] = [
  // ─── PILLAR 1 · Comprendre & comparer ──────────────────────────────────────
  {
    slug: 'credit-bail-ou-lld-differences-comment-choisir',
    pillarSlug: 'comprendre-comparer',
    nav: 'Crédit-bail ou LLD : comment choisir',
    title: 'Crédit-bail ou LLD : différences, avantages et comment choisir',
    metaTitle: 'Crédit-bail ou LLD : différences et comment choisir',
    metaDescription:
      "Crédit-bail ou LLD pour financer votre équipement professionnel ? Option d’achat, maintenance, comptabilité, durée : le comparatif complet pour choisir la bonne formule selon votre matériel.",
    excerpt:
      "Le crédit-bail vous rend propriétaire au terme ; la LLD inclut la maintenance et se restitue. Voici comment trancher selon votre équipement.",
    kicker: 'Comprendre & comparer',
    datePublished: '2026-11-18',
    dateModified: '2026-11-18',
    readingMinutes: 7,
    standfirst:
      "Le crédit-bail et la location longue durée (LLD) sont deux formes de financement locatif, mais elles ne répondent pas au même besoin. Le crédit-bail comporte une option d’achat qui vous permet de devenir propriétaire du matériel au terme du contrat ; la LLD est une location pure, souvent assortie de services (maintenance, entretien), où le bien est restitué à l’échéance. Le bon choix dépend surtout de la durée de vie de l’équipement et de votre intention de le garder ou non.",
    body: [
      { type: 'h2', text: 'Crédit-bail et LLD : la différence en une phrase' },
      {
        type: 'p',
        text: "Dans les deux cas, un organisme financeur achète l’équipement que vous avez choisi et vous le loue contre un loyer mensuel déductible, sans apport. La différence tient à la fin du contrat : en crédit-bail, une **option d’achat** à une valeur résiduelle fixée d’avance vous permet de devenir propriétaire ; en LLD, il n’y a pas d’option d’achat réglementée — vous louez l’usage du bien et vous le restituez, la maintenance étant fréquemment incluse dans le loyer.",
      },
      {
        type: 'callout',
        title: 'En bref',
        text: "Vous comptez garder le matériel et en faire un actif ? Le crédit-bail. Vous voulez un équipement toujours récent, un loyer tout compris et aucune revente à gérer ? La LLD.",
      },
      { type: 'h2', text: 'Le comparatif point par point' },
      {
        type: 'table',
        caption: 'Crédit-bail vs LLD pour un équipement professionnel',
        head: ['Critère', 'Crédit-bail', 'LLD (location longue durée)'],
        rows: [
          ['Fin de contrat', 'Option d’achat à valeur résiduelle', 'Restitution du bien (pas d’option réglementée)'],
          ['Objectif', 'Devenir propriétaire', 'Payer l’usage, renouveler'],
          ['Maintenance', 'Non incluse (à votre charge)', 'Souvent incluse dans le loyer'],
          ['Durée typique', '36 à 60 mois', '24 à 60 mois'],
          ['Traitement comptable', 'Loyer en charge, option à l’actif au terme', 'Loyer en charge (hors bilan)'],
          ['Idéal pour', 'Machine durable, matériel médical, industriel', 'Flotte, informatique, matériel à entretenir'],
        ],
      },
      { type: 'h2', text: 'Quand choisir le crédit-bail' },
      {
        type: 'p',
        text: "Le crédit-bail est la formule des équipements que vous voulez garder dans la durée et inscrire à votre actif à terme. C’est le standard pour le [matériel industriel](/solutions/credit-bail), la machine-outil, le matériel médical ou l’agencement durable. Vous déduisez les loyers pendant le contrat, puis vous levez l’option d’achat pour devenir propriétaire à une valeur résiduelle connue dès la signature.",
      },
      {
        type: 'ul',
        items: [
          "L’équipement a une longue durée de vie et peu d’obsolescence (une [machine industrielle](/secteurs/industrie-production), un [fauteuil dentaire](/secteurs/sante-cabinets-medicaux)).",
          'Vous souhaitez devenir propriétaire et bâtir un patrimoine professionnel.',
          'Vous assurez vous-même l’entretien ou avez déjà un contrat de maintenance.',
        ],
      },
      { type: 'h2', text: 'Quand choisir la LLD' },
      {
        type: 'p',
        text: "La [location longue durée](/solutions/lld) brille quand l’important est d’utiliser un matériel toujours à niveau sans se soucier de sa revente ni de son entretien. Le loyer regroupe le financement et les services (maintenance, parfois assurance), ce qui donne un coût mensuel prévisible. C’est le réflexe pour une [flotte de véhicules utilitaires](/secteurs/transport-logistique) ou des équipements très sollicités dont la panne coûte cher.",
      },
      {
        type: 'ul',
        items: [
          'Vous voulez renouveler régulièrement et éviter l’obsolescence.',
          'La maintenance est critique et vous préférez un loyer tout compris.',
          'Vous n’avez aucun intérêt à devenir propriétaire du bien en fin de vie.',
        ],
      },
      { type: 'h2', text: 'Et la location financière, dans tout ça ?' },
      {
        type: 'p',
        text: "La [location financière](/solutions/location-financiere) est proche de la LLD mais sans le volet services : c’est une location pure, sans maintenance incluse, idéale pour le [parc informatique](/secteurs/commerce-retail) et le matériel à renouvellement rapide. Si vous hésitez entre les trois, retenez ce fil : crédit-bail pour posséder, LLD pour un loyer tout compris, location financière pour la souplesse sur du matériel qui se démode vite.",
      },
      { type: 'h2', text: 'Un exemple chiffré' },
      {
        type: 'p',
        text: "Pour un équipement de 40 000 € HT financé sur 48 mois, le loyer mensuel s’établit autour de 1 080 € dans les deux formules — l’écart se joue surtout sur les services inclus (maintenance en LLD) et sur la valeur résiduelle à lever en fin de crédit-bail. Exemple illustratif, hors assurance et services. Sous réserve d’acceptation du dossier par le financeur.",
      },
      {
        type: 'callout',
        title: 'Vous ne savez pas trancher ?',
        text: "Déposez votre devis sur everlease : nous préparons un seul dossier et le présentons à des financeurs adaptés, qui proposent la formule la mieux calibrée pour votre matériel. Un conseiller vous rappelle sous 24 h ouvrées.",
      },
    ],
    faq: [
      {
        q: 'Quelle est la principale différence entre crédit-bail et LLD ?',
        a: "Le crédit-bail comporte une option d’achat qui vous permet de devenir propriétaire de l’équipement au terme du contrat, à une valeur résiduelle fixée d’avance. La LLD est une location pure, sans option d’achat réglementée : vous restituez le bien à l’échéance, et la maintenance est souvent incluse dans le loyer.",
      },
      {
        q: 'La LLD inclut-elle toujours la maintenance ?',
        a: "Très souvent, mais pas systématiquement. La LLD est conçue pour regrouper financement et services (maintenance, entretien, parfois assurance) dans un loyer unique. Le périmètre exact des services dépend du contrat et du partenaire financeur.",
      },
      {
        q: 'Le crédit-bail et la LLD sont-ils déductibles fiscalement ?',
        a: "Oui. Dans les deux cas, les loyers sont considérés comme des charges d’exploitation et sont déductibles du résultat imposable de l’entreprise, dans les conditions prévues par la réglementation.",
      },
      {
        q: 'Peut-on devenir propriétaire en LLD ?',
        a: "Non, pas via une option d’achat réglementée comme en crédit-bail. La LLD est une location : le bien est restitué au terme. Si votre objectif est de devenir propriétaire, le crédit-bail est la formule adaptée.",
      },
    ],
    relatedSolutions: ['credit-bail', 'lld', 'location-financiere'],
    relatedSectors: ['industrie-production', 'transport-logistique'],
    relatedArticles: [],
    published: true,
  },

  // ─── DRAFT · démontre le gate de relecture humaine (non rendu, non indexé) ──
  {
    slug: 'leasing-ou-credit-professionnel',
    pillarSlug: 'comprendre-comparer',
    nav: 'Leasing ou crédit professionnel',
    title: 'Leasing ou crédit professionnel : que choisir pour s’équiper ?',
    metaTitle: 'Leasing ou crédit professionnel : que choisir ?',
    metaDescription:
      "Leasing (financement locatif) ou crédit professionnel pour financer votre matériel ? Trésorerie, propriété, capacité d’emprunt, fiscalité : le comparatif.",
    excerpt:
      "Le leasing préserve la trésorerie et la capacité d’emprunt ; le crédit vous rend propriétaire tout de suite. Comment arbitrer.",
    kicker: 'Comprendre & comparer',
    datePublished: '2026-11-18',
    dateModified: '2026-11-18',
    readingMinutes: 6,
    standfirst: '',
    body: [],
    faq: [],
    relatedSolutions: ['location-financiere', 'credit-bail'],
    relatedSectors: [],
    relatedArticles: ['credit-bail-ou-lld-differences-comment-choisir'],
    published: false,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

/** Only published articles — the single source of truth for what is public. */
export function publishedArticles(): Article[] {
  return ARTICLES.filter((a) => a.published)
}

export function getArticle(slug: string): Article | undefined {
  // Never resolve a draft, even if the slug is guessed.
  return publishedArticles().find((a) => a.slug === slug)
}

export function getPillar(slug: string): Pillar | undefined {
  return PILLARS.find((p) => p.slug === slug)
}

/** Published articles grouped under a pillar, in array order. */
export function articlesByPillar(pillarSlug: string): Article[] {
  return publishedArticles().filter((a) => a.pillarSlug === pillarSlug)
}

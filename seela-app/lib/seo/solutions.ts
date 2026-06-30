// Content model for the "Solutions" SEO/GEO pages — one entry per equipment
// financing type. The data is written to be (1) crawlable & intent-matching for
// classic SEO and (2) answer-first + extractable for generative engines (GEO).
//
// Each page is rendered from this data by components/marketing/SolutionView.tsx,
// so the SEO structure (H1/H2, FAQ schema, comparison, internal links) stays
// identical across pages while the content stays genuinely differentiated.

export type Faq = { q: string; a: string }
export type Fact = { label: string; value: string }
export type Step = { title: string; body: string }

export type Solution = {
  slug: string
  /** Short label used in the nav dropdown. */
  nav: string
  /** Display name, e.g. "Crédit-bail". */
  name: string
  h1: string
  metaTitle: string
  metaDescription: string
  /** Hero sub-headline. */
  tagline: string
  /** Answer-first definition (2–3 sentences) — the GEO extract. */
  definition: string
  howItWorks: Step[]
  bestFor: string[]
  pros: string[]
  cons: string[]
  facts: Fact[]
  faq: Faq[]
  /** Slugs of related solutions for internal linking. */
  related: string[]
}

export const SOLUTIONS: Solution[] = [
  {
    slug: 'location-financiere',
    nav: 'Location financière',
    name: 'Location financière',
    h1: "La location financière d'équipement professionnel",
    metaTitle: "Location financière d'équipement professionnel",
    metaDescription:
      "La location financière permet de financer 100 % d'un équipement professionnel sans apport, en payant un loyer mensuel déductible. Définition, fonctionnement, avantages et estimation.",
    tagline:
      "Financez 100 % de votre matériel sans toucher à votre trésorerie, avec des loyers déductibles et sans engagement de rachat.",
    definition:
      "La location financière est un contrat par lequel un organisme financeur achète l'équipement que vous avez choisi et vous le loue sur une durée déterminée (24 à 60 mois) contre un loyer mensuel. Contrairement au crédit-bail, elle ne comporte pas d'option d'achat réglementée : vous payez l'usage du matériel, pas sa propriété. C'est la formule la plus souple pour le matériel qui se renouvelle vite — informatique, parc IT, télécom.",
    howItWorks: [
      { title: 'Vous choisissez votre matériel', body: "Vous sélectionnez librement l'équipement et le fournisseur de votre choix. Everlease n'impose ni catalogue, ni vendeur." },
      { title: "L'organisme financeur l'achète", body: "Le loueur règle votre fournisseur directement et devient propriétaire du bien pour toute la durée du contrat." },
      { title: 'Vous payez un loyer mensuel', body: "Vous versez un loyer fixe, intégralement déductible de votre résultat imposable, sur la durée convenue. Aucun apport n'est exigé." },
      { title: 'Au terme, vous arbitrez', body: "À l'échéance, vous restituez le matériel, prolongez la location ou rachetez le bien à sa valeur de marché — sans engagement contractuel de rachat." },
    ],
    bestFor: [
      'Parc informatique et matériel IT renouvelé tous les 3-4 ans',
      'Entreprises qui veulent préserver leur capacité d\'emprunt bancaire',
      'Équipements à obsolescence rapide (télécom, audiovisuel, écrans)',
      'Dirigeants qui privilégient la flexibilité au statut de propriétaire',
    ],
    pros: [
      "Financement à 100 %, sans apport ni caution personnelle systématique",
      "Loyers entièrement déductibles du résultat imposable",
      "Préserve la trésorerie et la capacité d'endettement bancaire",
      "Matériel toujours récent grâce au renouvellement en fin de contrat",
    ],
    cons: [
      "Coût total souvent supérieur à un achat comptant sur le long terme",
      "Pas d'option d'achat réglementée garantie comme en crédit-bail",
      "Vous n'êtes pas propriétaire : le bien ne figure pas à votre actif",
    ],
    facts: [
      { label: 'Durée typique', value: '24 à 60 mois' },
      { label: 'Apport', value: 'Aucun (financement 100 %)' },
      { label: 'Option d\'achat', value: 'Non réglementée' },
      { label: 'Traitement comptable', value: 'Loyer en charge (hors bilan)' },
      { label: 'Idéal pour', value: 'IT, télécom, matériel à renouveler' },
    ],
    faq: [
      { q: 'Quelle différence entre location financière et crédit-bail ?', a: "La location financière ne comporte pas d'option d'achat réglementée : vous payez l'usage du bien sans engagement de le racheter. Le crédit-bail, encadré par la loi, prévoit une option d'achat à une valeur résiduelle fixée d'avance qui vous permet de devenir propriétaire au terme." },
      { q: 'Les loyers de location financière sont-ils déductibles ?', a: "Oui. Les loyers de location financière sont considérés comme des charges d'exploitation et sont intégralement déductibles du résultat imposable de l'entreprise, ce qui réduit votre base d'imposition." },
      { q: 'Faut-il un apport pour une location financière ?', a: "Non, la location financière finance 100 % de la valeur de l'équipement. Aucun apport initial n'est requis, ce qui préserve votre trésorerie." },
      { q: 'Que devient le matériel à la fin du contrat ?', a: "Au terme, vous pouvez restituer le matériel, prolonger la location ou, selon l'organisme, racheter le bien à sa valeur de marché. Il n'y a pas d'option d'achat contractuelle garantie." },
      { q: 'Quels équipements financer en location financière ?', a: "Tout équipement professionnel à usage durable : matériel informatique et IT, serveurs, télécom, audiovisuel, écrans, et plus largement tout actif à obsolescence rapide que vous renouvelez régulièrement." },
    ],
    related: ['credit-bail', 'lld', 'loa'],
  },
  {
    slug: 'credit-bail',
    nav: 'Crédit-bail',
    name: 'Crédit-bail',
    h1: "Le crédit-bail mobilier pour les professionnels",
    metaTitle: "Crédit-bail mobilier : définition, fonctionnement, avantages",
    metaDescription:
      "Le crédit-bail mobilier finance vos équipements avec une option d'achat à valeur résiduelle fixée d'avance. Devenez propriétaire au terme. Définition, fiscalité et estimation de loyer.",
    tagline:
      "Financez votre équipement et devenez propriétaire au terme, avec une option d'achat fixée dès la signature.",
    definition:
      "Le crédit-bail mobilier est une opération de location encadrée par la loi (article L313-7 du Code monétaire et financier) par laquelle un établissement financier achète un équipement professionnel et vous le loue, avec une promesse de vente à une valeur résiduelle fixée dès la signature. À la différence de la location financière, le crédit-bail vous donne le droit de devenir propriétaire du bien au terme du contrat en levant l'option d'achat.",
    howItWorks: [
      { title: 'Choix du bien et du fournisseur', body: "Vous négociez votre matériel auprès du fournisseur de votre choix. L'établissement de crédit-bail valide le financement." },
      { title: "L'établissement achète et vous loue", body: "Le crédit-bailleur acquiert le bien et vous le met à disposition contre un loyer, tout en restant juridiquement propriétaire pendant le contrat." },
      { title: 'Loyers déductibles sur la durée', body: "Vous versez des loyers déductibles du résultat. La valeur résiduelle (option d'achat) est fixée dès le départ, souvent entre 1 % et 6 % du prix initial." },
      { title: "Levée de l'option d'achat", body: "Au terme, vous levez l'option d'achat pour devenir propriétaire, vous restituez le bien, ou vous prolongez. La propriété est l'issue la plus fréquente." },
    ],
    bestFor: [
      'Machines-outils, matériel industriel et équipements durables',
      'Matériel médical et dentaire à forte valeur',
      'Entreprises qui veulent devenir propriétaires au terme',
      'Investissements structurants amortis sur plusieurs années',
    ],
    pros: [
      "Financement à 100 % avec option d'achat à valeur résiduelle connue d'avance",
      "Loyers déductibles du résultat imposable",
      "Vous devenez propriétaire au terme en levant l'option",
      "Cadre légal protecteur et clairement défini",
    ],
    cons: [
      "Coût total supérieur à un achat comptant ou un crédit classique",
      "Engagement ferme sur toute la durée, résiliation anticipée coûteuse",
      "Réservé aux biens à usage professionnel et aux établissements agréés",
    ],
    facts: [
      { label: 'Durée typique', value: '24 à 60 mois' },
      { label: 'Cadre légal', value: 'Art. L313-7 CMF (réglementé)' },
      { label: 'Option d\'achat', value: 'Oui, valeur résiduelle fixée' },
      { label: 'Propriété au terme', value: 'Possible (levée d\'option)' },
      { label: 'Idéal pour', value: 'Machines, matériel médical, industrie' },
    ],
    faq: [
      { q: "Qu'est-ce que le crédit-bail mobilier ?", a: "Le crédit-bail mobilier est un contrat réglementé par lequel un établissement financier achète un équipement professionnel et vous le loue, avec une promesse de vente à une valeur résiduelle fixée à la signature. Vous pouvez devenir propriétaire au terme en levant l'option d'achat." },
      { q: 'Crédit-bail ou location financière : que choisir ?', a: "Choisissez le crédit-bail si vous comptez devenir propriétaire d'un bien durable (machine, matériel médical) grâce à son option d'achat réglementée. Préférez la location financière pour du matériel renouvelé vite (IT, télécom) où la propriété importe peu." },
      { q: "Quelle est la fiscalité du crédit-bail ?", a: "Les loyers de crédit-bail sont déductibles du résultat imposable. La TVA sur les loyers est récupérable. Lors de la levée d'option, le bien entre à l'actif à sa valeur résiduelle et devient amortissable." },
      { q: "Quelle est la valeur de l'option d'achat ?", a: "La valeur résiduelle de l'option d'achat est fixée dès la signature du contrat, généralement entre 1 % et 6 % du prix d'acquisition initial selon la durée et le type de bien." },
      { q: 'Peut-on résilier un crédit-bail par anticipation ?', a: "Oui, mais la résiliation anticipée d'un crédit-bail entraîne le paiement d'une indemnité couvrant les loyers restants et la valeur résiduelle. C'est un engagement ferme sur la durée convenue." },
    ],
    related: ['location-financiere', 'loa', 'leaseback'],
  },
  {
    slug: 'lld',
    nav: 'LLD — Location longue durée',
    name: 'LLD (Location Longue Durée)',
    h1: "La Location Longue Durée (LLD) pour les entreprises",
    metaTitle: "LLD : Location Longue Durée pour entreprises",
    metaDescription:
      "La LLD (Location Longue Durée) loue un équipement ou un véhicule sur 24 à 60 mois, services inclus, sans option d'achat. Définition, avantages et estimation de loyer.",
    tagline:
      "Louez votre matériel ou votre flotte avec maintenance et services inclus, sans option d'achat ni gestion de la revente.",
    definition:
      "La Location Longue Durée (LLD) est un contrat de location sur une durée déterminée (généralement 24 à 60 mois) sans option d'achat, qui inclut souvent des services associés : maintenance, assurance, assistance. Très utilisée pour les flottes de véhicules, elle s'applique aussi aux équipements professionnels. Vous payez un loyer tout compris pour l'usage du bien et le restituez au terme, sans vous soucier de sa revente.",
    howItWorks: [
      { title: 'Définition du besoin et des services', body: "Vous choisissez l'équipement et les services associés : maintenance, assurance, assistance, remplacement. Le loyer est calculé tout compris." },
      { title: 'Mise à disposition du bien', body: "Le loueur achète et met à disposition le matériel. Vous l'utilisez librement pendant toute la durée du contrat." },
      { title: 'Loyer unique tout compris', body: "Vous payez un seul loyer mensuel intégrant le financement et les services. Budget lissé et prévisible, sans coûts cachés d'entretien." },
      { title: 'Restitution au terme', body: "À l'échéance, vous restituez simplement le bien. Pas d'option d'achat, pas de gestion de la revente ni de risque sur la valeur résiduelle." },
    ],
    bestFor: [
      'Flottes de véhicules utilitaires et professionnels',
      'Entreprises qui veulent un budget mensuel tout compris',
      'Matériel nécessitant maintenance et entretien réguliers',
      'Sociétés qui ne veulent pas gérer la revente des actifs',
    ],
    pros: [
      "Loyer tout compris : financement + maintenance + assurance + assistance",
      "Budget lissé et prévisible, sans frais d'entretien imprévus",
      "Aucune gestion de la revente ni risque sur la valeur résiduelle",
      "Matériel renouvelé régulièrement, toujours en bon état",
    ],
    cons: [
      "Pas d'option d'achat : vous ne devenez jamais propriétaire",
      "Kilométrage ou usage souvent plafonné (surcoût en cas de dépassement)",
      "Coût des services intégré : loyer plus élevé qu'une location sèche",
    ],
    facts: [
      { label: 'Durée typique', value: '24 à 60 mois' },
      { label: 'Option d\'achat', value: 'Non' },
      { label: 'Services inclus', value: 'Maintenance, assurance, assistance' },
      { label: 'Propriété au terme', value: 'Non (restitution)' },
      { label: 'Idéal pour', value: 'Flottes, matériel à entretenir' },
    ],
    faq: [
      { q: "Qu'est-ce que la LLD pour une entreprise ?", a: "La LLD (Location Longue Durée) est un contrat de location sur 24 à 60 mois sans option d'achat, qui inclut souvent maintenance, assurance et assistance. L'entreprise paie un loyer tout compris pour l'usage du bien et le restitue au terme." },
      { q: 'Quelle différence entre LLD et LOA ?', a: "La LLD ne comporte pas d'option d'achat : vous restituez le bien au terme. La LOA (Location avec Option d'Achat) vous permet de devenir propriétaire en levant l'option d'achat à l'échéance. La LLD inclut plus souvent des services." },
      { q: 'La LLD inclut-elle la maintenance ?', a: "Oui, le plus souvent. C'est l'intérêt principal de la LLD : le loyer intègre la maintenance, l'assurance et l'assistance, pour un budget mensuel tout compris et prévisible." },
      { q: 'Peut-on acheter le bien en fin de LLD ?', a: "Non, la LLD ne prévoit pas d'option d'achat. À l'échéance, vous restituez le bien. Si vous souhaitez pouvoir l'acheter, orientez-vous vers la LOA ou le crédit-bail." },
      { q: 'La LLD est-elle réservée aux véhicules ?', a: "Non. Bien que popularisée par les flottes automobiles, la LLD s'applique à tout équipement professionnel : matériel informatique, machines, matériel médical, dès lors que des services d'entretien ont du sens." },
    ],
    related: ['loa', 'location-financiere', 'credit-bail'],
  },
  {
    slug: 'loa',
    nav: 'LOA — Location avec option d\'achat',
    name: "LOA (Location avec Option d'Achat)",
    h1: "La LOA (Location avec Option d'Achat) pour les professionnels",
    metaTitle: "LOA professionnelle : Location avec Option d'Achat",
    metaDescription:
      "La LOA (Location avec Option d'Achat) loue un équipement sur une durée fixe avec la possibilité de l'acheter au terme. Définition, différence avec la LLD et le crédit-bail, estimation.",
    tagline:
      "Louez aujourd'hui, décidez plus tard : la LOA vous laisse le choix de devenir propriétaire au terme.",
    definition:
      "La LOA (Location avec Option d'Achat), aussi appelée leasing, est un contrat de location sur une durée déterminée assorti d'une option d'achat que vous êtes libre de lever ou non au terme. Pendant le contrat, vous payez un loyer pour l'usage du bien ; à l'échéance, vous pouvez l'acheter à une valeur résiduelle convenue, le restituer ou prolonger. C'est la souplesse de la location avec la possibilité d'acquérir.",
    howItWorks: [
      { title: 'Choix du bien et de la durée', body: "Vous sélectionnez l'équipement et la durée du contrat. La valeur de l'option d'achat finale est définie dès la signature." },
      { title: 'Location avec loyers', body: "Le loueur achète le bien et vous le loue. Vous versez un loyer mensuel pour son usage, parfois après un premier loyer majoré." },
      { title: 'Liberté de décision au terme', body: "À l'échéance, trois options : lever l'option d'achat pour devenir propriétaire, restituer le bien, ou renouveler le contrat." },
      { title: "Levée d'option (facultative)", body: "Si vous achetez, vous réglez la valeur résiduelle et le bien devient votre propriété. Sinon, vous restituez sans engagement supplémentaire." },
    ],
    bestFor: [
      'Véhicules professionnels et utilitaires',
      'Entreprises qui hésitent entre louer et acheter',
      'Équipements dont la valeur résiduelle reste intéressante',
      'Dirigeants qui veulent garder le choix jusqu\'au terme',
    ],
    pros: [
      "Liberté de devenir propriétaire ou non au terme",
      "Loyers déductibles pendant la durée du contrat",
      "Financement sans apport lourd (hors premier loyer éventuel)",
      "Valeur de rachat connue dès la signature",
    ],
    cons: [
      "Premier loyer majoré fréquent en début de contrat",
      "Coût total supérieur à un achat comptant si l'option est levée",
      "Services (maintenance, assurance) rarement inclus, contrairement à la LLD",
    ],
    facts: [
      { label: 'Durée typique', value: '24 à 60 mois' },
      { label: 'Option d\'achat', value: 'Oui, facultative' },
      { label: 'Services inclus', value: 'Non (location sèche)' },
      { label: 'Propriété au terme', value: 'Au choix' },
      { label: 'Idéal pour', value: 'Véhicules, biens à valeur de revente' },
    ],
    faq: [
      { q: "Qu'est-ce que la LOA pour un professionnel ?", a: "La LOA (Location avec Option d'Achat) est un contrat de location à durée déterminée assorti d'une option d'achat. Vous louez le bien contre un loyer puis, au terme, vous êtes libre de l'acheter à une valeur résiduelle convenue, de le restituer ou de prolonger." },
      { q: 'Quelle différence entre LOA et crédit-bail ?', a: "La LOA et le crédit-bail reposent tous deux sur une location avec option d'achat. Le crédit-bail est un régime réglementé réservé aux établissements financiers agréés et orienté biens d'équipement professionnels, tandis que la LOA est un terme plus large, courant pour les véhicules." },
      { q: 'Quelle différence entre LOA et LLD ?', a: "La LOA comporte une option d'achat permettant de devenir propriétaire au terme ; la LLD non, vous restituez le bien. En contrepartie, la LLD inclut plus souvent des services comme la maintenance et l'assurance." },
      { q: 'Est-on obligé de lever l\'option d\'achat en LOA ?', a: "Non. L'option d'achat en LOA est facultative. Au terme du contrat, vous décidez librement de l'acheter à sa valeur résiduelle, de le restituer ou de renouveler la location." },
      { q: 'Les loyers de LOA sont-ils déductibles ?', a: "Oui, les loyers de LOA professionnelle sont déductibles du résultat imposable pendant la durée du contrat, sous réserve des règles applicables (notamment les plafonds pour les véhicules de tourisme)." },
    ],
    related: ['lld', 'credit-bail', 'location-financiere'],
  },
  {
    slug: 'leaseback',
    nav: 'Lease-back — Cession-bail',
    name: 'Lease-back (cession-bail)',
    h1: "Le lease-back (cession-bail) pour libérer votre trésorerie",
    metaTitle: "Lease-back / cession-bail : libérer la trésorerie d'un actif",
    metaDescription:
      "Le lease-back (cession-bail) consiste à vendre un équipement déjà acquis à un financeur puis à le relouer. Transformez vos actifs en trésorerie immédiate. Définition et fonctionnement.",
    tagline:
      "Vous possédez déjà un équipement ? Vendez-le à un financeur et reprenez-le en location pour récupérer du cash immédiatement.",
    definition:
      "Le lease-back, ou cession-bail, est une opération par laquelle une entreprise vend un équipement qu'elle possède déjà à un organisme financeur, puis le reprend immédiatement en location (crédit-bail ou location financière). Vous récupérez ainsi de la trésorerie correspondant à la valeur du bien tout en continuant à l'utiliser sans interruption. C'est un levier de refinancement pour transformer des actifs immobilisés en cash.",
    howItWorks: [
      { title: 'Évaluation de votre actif', body: "Le financeur évalue l'équipement que vous possédez déjà (machine, matériel, flotte) pour en déterminer la valeur de rachat." },
      { title: 'Cession du bien au financeur', body: "Vous vendez le bien à l'organisme financeur, qui vous règle immédiatement le prix convenu : votre trésorerie est renforcée." },
      { title: 'Reprise en location', body: "Dans le même temps, vous reprenez le bien en location (crédit-bail ou location financière) et continuez à l'utiliser sans interruption." },
      { title: 'Loyers et issue au terme', body: "Vous versez des loyers déductibles. Selon le contrat choisi, vous pourrez racheter le bien au terme via une option d'achat ou le restituer." },
    ],
    bestFor: [
      'Entreprises qui veulent libérer du cash sans céder un actif clé',
      'Sociétés avec un parc machines ou une flotte récemment acquis',
      'Renforcement de trésorerie en période de tension ou de croissance',
      'Refinancement d\'un investissement payé comptant',
    ],
    pros: [
      "Trésorerie immédiate sans perdre l'usage de l'équipement",
      "Loyers déductibles du résultat imposable",
      "Optimise le bilan en transformant un actif immobilisé en cash",
      "Possibilité de redevenir propriétaire via une option d'achat",
    ],
    cons: [
      "Le bien doit avoir une valeur de revente suffisante et être récent",
      "Coût de financement sur la part rachetée par le financeur",
      "Plus-value de cession éventuellement imposable selon la situation",
    ],
    facts: [
      { label: 'Principe', value: 'Vendre puis relouer son propre bien' },
      { label: 'Effet immédiat', value: 'Trésorerie renforcée' },
      { label: 'Support', value: 'Crédit-bail ou location financière' },
      { label: 'Propriété au terme', value: 'Possible (option d\'achat)' },
      { label: 'Idéal pour', value: 'Refinancement, tension de trésorerie' },
    ],
    faq: [
      { q: "Qu'est-ce que le lease-back ou cession-bail ?", a: "Le lease-back (cession-bail) est une opération où une entreprise vend un équipement qu'elle possède déjà à un financeur, puis le reprend immédiatement en location. Elle récupère la valeur du bien en trésorerie tout en continuant à l'utiliser." },
      { q: 'À quoi sert le lease-back ?', a: "Le lease-back sert à libérer de la trésorerie immobilisée dans un actif déjà payé. C'est un outil de refinancement utile en période de tension de trésorerie, pour financer la croissance ou optimiser le bilan, sans interrompre l'usage du matériel." },
      { q: 'Quels biens peut-on financer en lease-back ?', a: "Tout équipement professionnel ayant une valeur de revente suffisante et relativement récent : machines-outils, matériel industriel, flotte de véhicules, matériel médical ou informatique de valeur." },
      { q: 'Le lease-back a-t-il un impact fiscal ?', a: "Les loyers versés après la cession sont déductibles. En revanche, la vente du bien au financeur peut générer une plus-value de cession imposable selon sa valeur nette comptable. Un point avec votre expert-comptable est recommandé." },
      { q: 'Reste-t-on propriétaire après un lease-back ?', a: "Non pendant le contrat : le financeur devient propriétaire du bien. Mais si l'opération s'appuie sur un crédit-bail, vous pourrez redevenir propriétaire au terme en levant l'option d'achat." },
    ],
    related: ['credit-bail', 'location-financiere', 'lld'],
  },
]

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.slug === slug)
}

// ---------------------------------------------------------------------------
// Comparison matrix — rendered on every solution page (and the hub). Highly
// extractable for generative engines and a strong internal-linking surface.
// ---------------------------------------------------------------------------

export type ComparisonRow = {
  dimension: string
  /** Keyed by solution slug. */
  values: Record<string, string>
}

export const COMPARISON_DIMENSIONS = [
  'location-financiere',
  'credit-bail',
  'lld',
  'loa',
  'leaseback',
] as const

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    dimension: "Option d'achat",
    values: {
      'location-financiere': 'Non réglementée',
      'credit-bail': 'Oui, valeur fixée',
      lld: 'Non',
      loa: 'Oui, facultative',
      leaseback: 'Selon le support',
    },
  },
  {
    dimension: 'Propriété au terme',
    values: {
      'location-financiere': 'Non',
      'credit-bail': 'Possible',
      lld: 'Non',
      loa: 'Au choix',
      leaseback: 'Possible',
    },
  },
  {
    dimension: 'Services inclus',
    values: {
      'location-financiere': 'Non',
      'credit-bail': 'Non',
      lld: 'Oui (maintenance, etc.)',
      loa: 'Non',
      leaseback: 'Selon le support',
    },
  },
  {
    dimension: 'Effet trésorerie',
    values: {
      'location-financiere': 'Préserve le cash',
      'credit-bail': 'Préserve le cash',
      lld: 'Préserve le cash',
      loa: 'Préserve le cash',
      leaseback: 'Génère du cash',
    },
  },
  {
    dimension: 'Idéal pour',
    values: {
      'location-financiere': 'IT, télécom',
      'credit-bail': 'Machines, médical',
      lld: 'Flottes, entretien',
      loa: 'Véhicules',
      leaseback: 'Refinancement',
    },
  },
]

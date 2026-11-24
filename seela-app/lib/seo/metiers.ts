// Content model for the "Métiers" SEO pages — granular trades below the broad
// Sectors (lib/seo/sectors.ts). Targets the high-intent long-tail query
// "financer le matériel de mon / ma <métier>" with an exact-match H1, a real
// per-trade equipment kit and financing fit. Each métier links UP to its
// parent sector, so the maillage stays coherent (métier → secteur → solution).
//
// Rendered by components/marketing/MetierView.tsx. Reuses the shared content
// primitives (EquipmentLine, SolutionFit, SectorExample, Faq).

import type { EquipmentLine, SolutionFit, SectorExample } from './sectors'
import type { Faq } from './solutions'

export type Metier = {
  slug: string
  /** Short label (nav, cards, related lists). */
  nav: string
  /** Display name, e.g. "studio de Pilates & yoga". */
  name: string
  /** Slug of the broad parent sector (lib/seo/sectors.ts) for the "up" link. */
  parentSectorSlug: string
  h1: string
  metaTitle: string
  metaDescription: string
  tagline: string
  /** Answer-first intro (GEO extract). */
  intro: string
  equipment: EquipmentLine[]
  solutionFit: SolutionFit[]
  /** One illustrative financing example. */
  example: SectorExample
  faq: Faq[]
  relatedMetiers: string[]
  relatedSolutions: string[]
}

export const METIERS: Metier[] = [
  {
    slug: 'studio-pilates-yoga',
    nav: 'Studio de Pilates & yoga',
    name: 'studio de Pilates & yoga',
    parentSectorSlug: 'salles-de-sport-fitness',
    h1: 'Financer le matériel de votre studio de Pilates ou de yoga',
    metaTitle: 'Financer le matériel de son studio de Pilates / yoga',
    metaDescription:
      "Reformers, Cadillac, barrels, tapis, chauffage : financez l'équipement de votre studio de Pilates ou de yoga en leasing, sans apport et en loyers déductibles. Estimation en ligne.",
    tagline:
      "Reformers, Cadillac, barils, accessoires et agencement : ouvrez ou rééquipez votre studio sans immobiliser votre trésorerie.",
    intro:
      "Équiper un studio de Pilates revient vite cher : un reformer professionnel coûte 2 500 à 5 000 €, et un studio en aligne souvent six à dix, auxquels s'ajoutent Cadillac, barrels, chaises et l'agencement. Le financement locatif (location financière, crédit-bail) permet d'étaler cet investissement en loyers mensuels déductibles, sans apport, et de garder votre trésorerie pour le loyer du local et le lancement.",
    equipment: [
      { category: 'Pilates reformer', examples: 'Reformers, tours, planches à sauter' },
      { category: 'Grand matériel', examples: 'Cadillac, ladder barrel, chaises Wunda' },
      { category: 'Yoga & sol', examples: 'Tapis, briques, sangles, bolsters, rangements' },
      { category: 'Ambiance & confort', examples: 'Chauffage (hot yoga), sonorisation, miroirs' },
      { category: 'Accueil & logiciel', examples: 'Comptoir, logiciel de réservation, TPE' },
    ],
    solutionFit: [
      { solutionSlug: 'location-financiere', equipment: 'Reformers & parc de machines', why: "La location financière finance 100 % du parc sans apport et permet de le renouveler — pratique pour un studio qui monte en gamme." },
      { solutionSlug: 'credit-bail', equipment: 'Grand matériel durable (Cadillac, barrels)', why: "Pour le matériel que vous gardez des années, le crédit-bail vous rend propriétaire au terme tout en déduisant les loyers." },
    ],
    example: { label: 'Parc de 8 reformers + accessoires', total: '32 000 €', monthly: '≈ 864 €', duration: '48 mois' },
    faq: [
      { q: 'Peut-on financer des reformers en leasing ?', a: "Oui. Les reformers et l'ensemble du matériel de Pilates se financent en location financière ou en crédit-bail : le financeur achète les machines chez votre fournisseur et vous les loue contre un loyer mensuel déductible, sans apport." },
      { q: "J'ouvre mon studio, puis-je financer sans historique ?", a: "Une création est étudiable : le dossier s'appuie sur votre prévisionnel et votre apport personnel. everlease présente votre demande à des financeurs adaptés aux créateurs. Sous réserve d'acceptation du dossier par le financeur." },
      { q: "Et l'agencement du studio ?", a: "Le matériel et une partie de l'agencement (miroirs, sol technique, sonorisation) peuvent être financés. Les prestations de pose pure ne le sont généralement pas." },
    ],
    relatedMetiers: ['box-crossfit'],
    relatedSolutions: ['location-financiere', 'credit-bail'],
  },
  {
    slug: 'box-crossfit',
    nav: 'Box de CrossFit',
    name: 'box de CrossFit & cross-training',
    parentSectorSlug: 'salles-de-sport-fitness',
    h1: 'Financer le matériel de votre box de CrossFit',
    metaTitle: 'Financer le matériel de sa box de CrossFit',
    metaDescription:
      "Rigs, barres, haltères, rameurs, assault bikes : financez l'équipement de votre box de CrossFit en leasing, sans apport, en loyers déductibles. Estimation en ligne.",
    tagline:
      "Rig, charges, cardio et sol : équipez votre box sans vider votre trésorerie au lancement ou à l'agrandissement.",
    intro:
      "Une box de CrossFit demande un gros investissement matériel d'entrée : un rig complet, les barres et disques, les haltères, les machines cardio (rameurs, assault bikes, skiergs) et le sol dépassent souvent 40 000 €. Le financement locatif étale ce coût en loyers mensuels déductibles, sans apport, et vous laisse la trésorerie pour le loyer du local et la communauté.",
    equipment: [
      { category: 'Structure', examples: 'Rig, racks, pull-up bars, supports' },
      { category: 'Charges', examples: 'Barres olympiques, disques, haltères, kettlebells' },
      { category: 'Cardio', examples: 'Rameurs, assault bikes, skiergs, tapis curved' },
      { category: 'Sol & conditionnement', examples: 'Dalles, gazon de drag, box plyo, cordes' },
      { category: 'Accueil & logiciel', examples: 'Comptoir, logiciel de réservation, écrans WOD' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Rig, charges & structure durable', why: "Du matériel robuste que vous gardez : le crédit-bail vous rend propriétaire au terme, loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'Cardio renouvelé régulièrement', why: "Pour les machines cardio sollicitées en continu, la location financière finance 100 % et facilite le renouvellement." },
    ],
    example: { label: 'Équipement complet de box', total: '45 000 €', monthly: '≈ 1 215 €', duration: '48 mois' },
    faq: [
      { q: 'Peut-on financer un rig et des machines cardio en leasing ?', a: "Oui. Rig, charges et machines cardio se financent très bien en crédit-bail ou location financière, contre un loyer mensuel déductible et sans apport." },
      { q: "Je m'agrandis, puis-je refinancer mon matériel existant ?", a: "Oui, via le lease-back : vous cédez le matériel déjà acheté à un financeur et le relouez pour récupérer de la trésorerie, sans cesser de l'utiliser." },
      { q: 'La saisonnalité des abonnements est-elle prise en compte ?', a: "Selon le financeur, des loyers modulables sont possibles. everlease présente votre dossier à des financeurs adaptés. Sous réserve d'acceptation du dossier." },
    ],
    relatedMetiers: ['studio-pilates-yoga'],
    relatedSolutions: ['credit-bail', 'location-financiere', 'leaseback'],
  },
  {
    slug: 'hotel',
    nav: 'Hôtel',
    name: 'hôtel',
    parentSectorSlug: 'chr-hotellerie-restauration',
    h1: "Financer l'équipement de votre hôtel",
    metaTitle: "Financer l'équipement de son hôtel",
    metaDescription:
      "Literie, mobilier de chambre, TV, Wi-Fi, PMS, blanchisserie : financez la rénovation et l'équipement de votre hôtel en leasing, sans immobiliser votre trésorerie. Estimation en ligne.",
    tagline:
      "Literie, chambres, multimédia, blanchisserie et PMS : rénovez et équipez votre hôtel en loyers mensuels, sans puiser dans votre trésorerie.",
    intro:
      "Rénover les chambres d'un hôtel chiffre vite : literie, mobilier, téléviseurs, Wi-Fi et climatisation représentent des dizaines de milliers d'euros, avec une activité saisonnière et des marges serrées. Le financement locatif (crédit-bail, location financière, LLD) étale cet investissement en loyers déductibles et vous permet de garder un parc attractif pour vos réservations sans immobiliser votre cash.",
    equipment: [
      { category: 'Chambres & literie', examples: 'Literie, matelas, sommiers, mobilier de chambre' },
      { category: 'Multimédia & connectivité', examples: 'Téléviseurs, IPTV, réseau Wi-Fi, coffres-forts' },
      { category: 'Confort', examples: 'Climatisation, chauffage, minibars' },
      { category: 'Blanchisserie', examples: 'Lave-linge, sèche-linge, repassage professionnel' },
      { category: 'Réception & IT', examples: 'PMS hôtelier, channel manager, TPE, bornes' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Literie & mobilier de chambre', why: "Du matériel durable que vous gardez : le crédit-bail vous rend propriétaire au terme, loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'TV, Wi-Fi & PMS', why: "Matériel qui se renouvelle vite : la location financière finance 100 % sans engagement de rachat, pour des chambres toujours à jour." },
      { solutionSlug: 'lld', equipment: 'Blanchisserie à entretenir', why: "La LLD intègre la maintenance dans le loyer — pas de mauvaise surprise sur un équipement sollicité en continu." },
    ],
    example: { label: 'Rénovation de chambres (literie, TV, mobilier)', total: '80 000 €', monthly: '≈ 1 840 €', duration: '60 mois' },
    faq: [
      { q: "Peut-on financer la literie et l'équipement des chambres ?", a: "Oui. Literie, mobilier, téléviseurs, Wi-Fi et climatisation se financent en crédit-bail ou location financière, en loyers mensuels déductibles et sans apport." },
      { q: 'Le financement tient-il compte de la saisonnalité hôtelière ?', a: "Selon le contrat et le financeur, des loyers modulables ou des reports en basse saison sont possibles. everlease présente votre dossier à des financeurs adaptés à une activité saisonnière." },
      { q: "J'ai rénové mes chambres comptant, est-ce trop tard ?", a: "Non. Le lease-back vous permet de céder un équipement déjà installé à un financeur et de le relouer pour récupérer la trésorerie immobilisée." },
    ],
    relatedMetiers: [],
    relatedSolutions: ['credit-bail', 'location-financiere', 'lld', 'leaseback'],
  },
  {
    slug: 'institut-beaute-esthetique',
    nav: 'Institut de beauté',
    name: 'institut de beauté & esthétique',
    parentSectorSlug: 'commerce-retail',
    h1: 'Financer le matériel de votre institut de beauté',
    metaTitle: 'Financer le matériel de son institut de beauté',
    metaDescription:
      "Cabines, appareils (lumière pulsée, cryolipolyse, HIFU), mobilier : financez l'équipement de votre institut de beauté ou centre esthétique en leasing, sans apport. Estimation en ligne.",
    tagline:
      "Appareils esthétiques, cabines et mobilier : équipez votre institut sans immobiliser votre trésorerie.",
    intro:
      "Les appareils d'esthétique figurent parmi les plus coûteux du secteur : une plateforme de lumière pulsée, un appareil de cryolipolyse ou de HIFU dépasse souvent 15 000 à 40 000 €. Le financement locatif (crédit-bail, location financière) permet d'accéder à des technologies de pointe immédiatement, en loyers déductibles et sans puiser dans votre épargne.",
    equipment: [
      { category: 'Appareils esthétiques', examples: 'Lumière pulsée, laser, cryolipolyse, HIFU, radiofréquence' },
      { category: 'Cabines & soins', examples: 'Tables de soins, cabines UV, vapozone, stérilisation' },
      { category: 'Mobilier & agencement', examples: 'Accueil, fauteuils, meubles de cabine, éclairage' },
      { category: 'Encaissement & logiciel', examples: 'Caisse, logiciel de réservation, TPE' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Appareils esthétiques durables', why: "Matériel à forte valeur que vous gardez : le crédit-bail vous rend propriétaire au terme, loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'Technologies à renouveler', why: "Pour des appareils qui évoluent vite, la location financière évite l'obsolescence et finance 100 % sans rachat imposé." },
    ],
    example: { label: 'Appareil de cryolipolyse + cabine', total: '28 000 €', monthly: '≈ 756 €', duration: '48 mois' },
    faq: [
      { q: 'Peut-on financer un appareil de lumière pulsée ou de cryolipolyse ?', a: "Oui. Les appareils esthétiques se financent en crédit-bail ou location financière : le financeur achète l'appareil chez votre fournisseur et vous le loue contre un loyer mensuel déductible, sans apport." },
      { q: 'Quelle durée pour un appareil esthétique ?', a: "Généralement 36 à 60 mois, à caler sur la durée d'exploitation de l'appareil. Une durée plus longue réduit le loyer mensuel ; une durée plus courte réduit le coût total." },
      { q: "Je m'installe, puis-je financer sans historique ?", a: "Une installation est étudiable sur la base de votre prévisionnel et de votre apport. everlease présente votre dossier à des financeurs adaptés. Sous réserve d'acceptation du dossier." },
    ],
    relatedMetiers: ['salon-de-coiffure'],
    relatedSolutions: ['credit-bail', 'location-financiere'],
  },
  {
    slug: 'salon-de-coiffure',
    nav: 'Salon de coiffure',
    name: 'salon de coiffure',
    parentSectorSlug: 'commerce-retail',
    h1: 'Financer le matériel de votre salon de coiffure',
    metaTitle: 'Financer le matériel de son salon de coiffure',
    metaDescription:
      "Bacs, fauteuils, climazon, mobilier, agencement : financez l'équipement de votre salon de coiffure en leasing, sans apport et en loyers déductibles. Estimation en ligne.",
    tagline:
      "Bacs, fauteuils, mobilier et agencement : ouvrez ou rénovez votre salon sans immobiliser votre trésorerie.",
    intro:
      "Agencer un salon de coiffure représente un budget conséquent : bacs à shampoing, fauteuils, meubles de coiffage, climazons et agencement complet dépassent souvent 25 000 €. Le financement locatif (location financière, crédit-bail) étale cet investissement en loyers mensuels déductibles, sans apport, et préserve votre trésorerie pour le lancement.",
    equipment: [
      { category: 'Postes de coiffage', examples: 'Fauteuils, meubles, miroirs, tablettes' },
      { category: 'Lavage', examples: 'Bacs à shampoing, fauteuils de bac' },
      { category: 'Technique', examples: 'Climazons, casques, séchoirs, stérilisation' },
      { category: 'Mobilier & agencement', examples: 'Accueil, attente, éclairage, enseigne' },
      { category: 'Encaissement', examples: 'Caisse, logiciel de rendez-vous, TPE' },
    ],
    solutionFit: [
      { solutionSlug: 'location-financiere', equipment: 'Agencement & postes', why: "La location financière finance 100 % de l'aménagement sans apport, idéal pour une ouverture ou une rénovation." },
      { solutionSlug: 'credit-bail', equipment: 'Mobilier durable', why: "Pour le mobilier que vous gardez, le crédit-bail vous rend propriétaire au terme tout en déduisant les loyers." },
    ],
    example: { label: 'Agencement complet de salon', total: '30 000 €', monthly: '≈ 810 €', duration: '48 mois' },
    faq: [
      { q: "Peut-on financer l'agencement complet d'un salon ?", a: "Oui. Le mobilier, les bacs, les fauteuils et une large part de l'agencement se financent en location financière ou crédit-bail, en loyers mensuels déductibles et sans apport." },
      { q: "J'ouvre mon premier salon, est-ce possible ?", a: "Une création est étudiable sur la base de votre prévisionnel et de votre apport. everlease présente votre dossier à des financeurs adaptés aux créateurs. Sous réserve d'acceptation du dossier." },
      { q: "Les prestations de pose sont-elles financées ?", a: "Le matériel et l'agencement le sont ; les prestations de service pures (pose, conseil) ne le sont en général pas." },
    ],
    relatedMetiers: ['institut-beaute-esthetique'],
    relatedSolutions: ['location-financiere', 'credit-bail'],
  },
  {
    slug: 'cabinet-kinesitherapie',
    nav: 'Cabinet de kinésithérapie',
    name: 'cabinet de kinésithérapie',
    parentSectorSlug: 'sante-cabinets-medicaux',
    h1: 'Financer le matériel de votre cabinet de kinésithérapie',
    metaTitle: 'Financer le matériel de son cabinet de kiné',
    metaDescription:
      "Tables, physiothérapie, plateau de rééducation, informatique : financez l'équipement de votre cabinet de kinésithérapie en crédit-bail ou location financière, sans apport. Estimation en ligne.",
    tagline:
      "Tables, physiothérapie et plateau de rééducation : équipez votre cabinet sans mobiliser votre épargne professionnelle.",
    intro:
      "S'installer en kinésithérapie demande un plateau technique coûteux : tables électriques, appareils de physiothérapie (ondes de choc, électrothérapie, ultrasons) et matériel de rééducation représentent un investissement important, souvent au moment où la trésorerie est la plus fragile. Le crédit-bail médical étale ce coût sur 4 à 5 ans, en loyers déductibles et sans apport.",
    equipment: [
      { category: 'Tables & installations', examples: 'Tables électriques, tables de massage, bancs' },
      { category: 'Physiothérapie', examples: 'Ondes de choc, électrothérapie, ultrasons, laser' },
      { category: 'Rééducation', examples: 'Plateaux, appareils de renforcement, vélos' },
      { category: 'Informatique de cabinet', examples: 'Logiciel métier, poste, télétransmission' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Tables & physiothérapie', why: "Le crédit-bail médical est le standard : matériel durable que vous gardez, propriété au terme et loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'Informatique de cabinet', why: "Pour le matériel informatique qui se renouvelle, la location financière évite l'obsolescence et finance 100 %." },
    ],
    example: { label: 'Plateau de rééducation + 2 tables', total: '24 000 €', monthly: '≈ 648 €', duration: '48 mois' },
    faq: [
      { q: 'Peut-on financer un plateau de kiné en crédit-bail ?', a: "Oui. Tables, appareils de physiothérapie et matériel de rééducation se financent en crédit-bail médical ou en location financière, contre un loyer mensuel déductible et sans apport." },
      { q: "Je m'installe, puis-je financer en début d'activité ?", a: "Une installation est étudiable sur la base de votre prévisionnel. everlease présente votre dossier à des financeurs adaptés aux professions de santé qui s'installent. Sous réserve d'acceptation du dossier." },
      { q: 'Quelle durée pour du matériel de kiné ?', a: "Souvent 48 à 60 mois, à caler sur la durée d'utilisation. Une durée plus longue réduit le loyer mensuel ; une durée plus courte réduit le coût total." },
    ],
    relatedMetiers: ['cabinet-veterinaire'],
    relatedSolutions: ['credit-bail', 'location-financiere'],
  },
  {
    slug: 'cabinet-veterinaire',
    nav: 'Cabinet vétérinaire',
    name: 'cabinet vétérinaire',
    parentSectorSlug: 'sante-cabinets-medicaux',
    h1: 'Financer le matériel de votre cabinet vétérinaire',
    metaTitle: 'Financer le matériel de sa clinique vétérinaire',
    metaDescription:
      "Imagerie, bloc chirurgical, analyseurs, table de contention : financez l'équipement de votre cabinet ou clinique vétérinaire en crédit-bail, sans apport. Estimation en ligne.",
    tagline:
      "Imagerie, chirurgie, laboratoire : équipez votre clinique vétérinaire sans immobiliser votre trésorerie.",
    intro:
      "Équiper une clinique vétérinaire mobilise un capital important : radiologie, échographe, bloc chirurgical, analyseurs de laboratoire et table de contention représentent plusieurs dizaines de milliers d'euros. Le crédit-bail vétérinaire étale ce coût sur 4 à 5 ans, en loyers déductibles et sans apport, pour un plateau technique de pointe dès l'installation.",
    equipment: [
      { category: 'Imagerie', examples: 'Radiologie, échographe, capteur numérique' },
      { category: 'Chirurgie', examples: 'Table de chirurgie, bistouri, anesthésie, monitoring' },
      { category: 'Laboratoire', examples: 'Analyseurs biochimie/hémato, microscope, centrifugeuse' },
      { category: 'Contention & soins', examples: 'Tables de contention, cages, stérilisation' },
      { category: 'Informatique', examples: 'Logiciel vétérinaire, postes, serveur' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Imagerie, chirurgie & laboratoire', why: "Matériel durable à forte valeur que vous gardez : le crédit-bail vous rend propriétaire au terme, loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'Informatique & logiciel', why: "Pour le matériel informatique qui se renouvelle, la location financière finance 100 % sans rachat imposé." },
    ],
    example: { label: 'Échographe + capteur radio numérique', total: '42 000 €', monthly: '≈ 1 134 €', duration: '48 mois' },
    faq: [
      { q: 'Peut-on financer un échographe ou une radio vétérinaire en leasing ?', a: "Oui. L'imagerie, le bloc chirurgical et les analyseurs se financent en crédit-bail vétérinaire ou location financière, contre un loyer mensuel déductible et sans apport." },
      { q: "Je crée ma clinique, est-ce finançable ?", a: "Une création est étudiable sur la base de votre prévisionnel et de votre apport. everlease présente votre dossier à des financeurs adaptés. Sous réserve d'acceptation du dossier." },
      { q: "J'ai déjà acheté mon matériel comptant, puis-je récupérer de la trésorerie ?", a: "Oui, via le lease-back : vous cédez le matériel à un financeur et le relouez pour dégager du cash, sans cesser de l'utiliser." },
    ],
    relatedMetiers: ['cabinet-kinesitherapie'],
    relatedSolutions: ['credit-bail', 'location-financiere', 'leaseback'],
  },
  {
    slug: 'garage-automobile',
    nav: 'Garage automobile',
    name: 'garage automobile',
    parentSectorSlug: 'industrie-production',
    h1: 'Financer le matériel de votre garage automobile',
    metaTitle: 'Financer le matériel de son garage automobile',
    metaDescription:
      "Ponts élévateurs, valises de diagnostic, équilibreuse, démonte-pneus, banc géométrie : financez l'équipement de votre garage en leasing, sans apport. Estimation en ligne.",
    tagline:
      "Ponts, diagnostic, pneumatique et outillage : équipez votre garage sans immobiliser votre trésorerie.",
    intro:
      "Équiper un garage automobile mobilise un investissement lourd : ponts élévateurs, valises de diagnostic multimarques, équilibreuse, démonte-pneus, banc de géométrie et outillage dépassent souvent 50 000 €. Le financement locatif (crédit-bail, location financière) étale ce coût en loyers mensuels déductibles, sans apport, pour un atelier équipé dès l'ouverture.",
    equipment: [
      { category: 'Levage', examples: 'Ponts élévateurs 2 et 4 colonnes, crics' },
      { category: 'Diagnostic', examples: 'Valises multimarques, station climatisation, banc' },
      { category: 'Pneumatique', examples: 'Démonte-pneus, équilibreuse, géométrie 3D' },
      { category: 'Outillage & atelier', examples: 'Servantes, compresseurs, servante d\'atelier' },
      { category: 'Gestion', examples: 'Logiciel de gestion, caisse, TPE' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Ponts, banc & gros outillage', why: "Matériel durable que vous gardez des années : le crédit-bail vous rend propriétaire au terme, loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'Diagnostic qui évolue vite', why: "Les valises et stations évoluent avec les véhicules : la location financière finance 100 % et facilite le renouvellement." },
    ],
    example: { label: 'Pont élévateur + diagnostic + pneumatique', total: '48 000 €', monthly: '≈ 1 296 €', duration: '48 mois' },
    faq: [
      { q: 'Peut-on financer un pont élévateur et une valise de diagnostic en leasing ?', a: "Oui. Le levage, le diagnostic, le matériel pneumatique et l'outillage se financent en crédit-bail ou location financière, contre un loyer mensuel déductible et sans apport." },
      { q: "J'ouvre mon garage, est-ce finançable sans historique ?", a: "Une création est étudiable sur la base de votre prévisionnel et de votre apport. everlease présente votre dossier à des financeurs adaptés. Sous réserve d'acceptation du dossier." },
      { q: 'Quelle durée pour du matériel de garage ?', a: "Souvent 48 à 60 mois, à caler sur la durée d'utilisation du matériel. Une durée plus longue réduit le loyer mensuel ; une durée plus courte réduit le coût total." },
    ],
    relatedMetiers: [],
    relatedSolutions: ['credit-bail', 'location-financiere'],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

export function getMetier(slug: string): Metier | undefined {
  return METIERS.find((m) => m.slug === slug)
}

/** Métiers whose parent is this sector — for the sector → métiers cross-links. */
export function getMetiersForSector(sectorSlug: string): Metier[] {
  return METIERS.filter((m) => m.parentSectorSlug === sectorSlug)
}

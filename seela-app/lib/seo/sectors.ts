// Content model for the "Secteurs" (Clients) SEO/GEO pages — one entry per
// targeted industry. The high-value angle is the solution × secteur matrix:
// each page maps the sector's real equipment to the financing solution that
// fits it best, with contextual internal links to /solutions/[slug].
//
// Rendered by components/marketing/SectorView.tsx. Photo slots are described
// here (alt + hint) so stock images can be dropped in later via `src`.

import type { Faq } from './solutions'

export type EquipmentLine = { category: string; examples: string }
export type SolutionFit = { solutionSlug: string; equipment: string; why: string }
export type SectorExample = { label: string; total: string; monthly: string; duration: string }
/** A photo slot: alt/description for SEO + a hint for whoever sources the image.
 *  Leave `src` empty to render a placeholder; fill it later with a stock photo.
 *  `objectPosition` tweaks the crop focus (e.g. 'center bottom'). */
export type Photo = { alt: string; hint: string; src?: string; objectPosition?: string }

export type Sector = {
  slug: string
  nav: string
  name: string
  h1: string
  metaTitle: string
  metaDescription: string
  tagline: string
  /** Answer-first intro (GEO extract). */
  intro: string
  /** Sector cash-flow reality — why leasing makes sense here. */
  whyFinance: string
  equipment: EquipmentLine[]
  /** The solution × secteur core: equipment → best-fit financing + reason. */
  solutionFit: SolutionFit[]
  examples: SectorExample[]
  faq: Faq[]
  photos: { hero: Photo; equipment: Photo; ambiance: Photo }
  related: string[]
}

export const SECTORS: Sector[] = [
  {
    slug: 'chr-hotellerie-restauration',
    nav: 'CHR — Hôtellerie & restauration',
    name: 'CHR (hôtellerie, café, restauration)',
    h1: "Financer les équipements de votre établissement CHR",
    metaTitle: "Financement équipement CHR : hôtel, restaurant, café",
    metaDescription:
      "Financez cuisine professionnelle, literie, mobilier et agencement de votre hôtel, restaurant ou café sans vider votre trésorerie. Solutions de leasing CHR adaptées à la saisonnalité.",
    tagline:
      "Cuisine professionnelle, chambres, mobilier, agencement : équipez votre hôtel, restaurant ou café sans immobiliser votre trésorerie.",
    intro:
      "Dans l'hôtellerie comme dans la restauration, l'équipement pèse lourd : une cuisine professionnelle complète dépasse souvent 40 000 €, et rénover la literie, les téléviseurs et le mobilier des chambres d'un hôtel se chiffre vite en dizaines de milliers d'euros — le tout avec des marges serrées et une activité saisonnière. Le financement locatif (crédit-bail, location financière, LLD) permet d'étaler ce coût en loyers mensuels déductibles, de préserver votre trésorerie pour le quotidien (stocks, salaires, saison creuse) et de renouveler aussi bien votre matériel que vos chambres sans repartir de zéro.",
    whyFinance:
      "Un établissement CHR — hôtel, restaurant ou café — vit au rythme des saisons : forte activité en haute saison, trésorerie tendue le reste de l'année. Payer comptant une cuisine, l'agencement d'une salle ou la rénovation complète des chambres d'un hôtel immobilise un cash dont vous avez besoin pour vos achats, vos salaires et l'entretien courant. Le leasing lisse l'investissement, préserve votre capacité bancaire, et permet de garder des chambres et un matériel toujours à niveau — un critère décisif pour vos réservations et la satisfaction de vos clients.",
    equipment: [
      { category: 'Cuisine professionnelle', examples: 'Pianos, fours, friteuses, plaques, salamandres' },
      { category: 'Froid & conservation', examples: 'Chambres froides, vitrines réfrigérées, cellules' },
      { category: 'Chambres & literie', examples: 'Literie, matelas, sommiers, mobilier de chambre' },
      { category: 'TV, multimédia & Wi-Fi', examples: 'Téléviseurs, IPTV, réseau Wi-Fi, coffres-forts' },
      { category: 'Mobilier & agencement', examples: 'Salle, réception, terrasse, banquettes' },
      { category: 'Laverie & blanchisserie', examples: 'Lave-vaisselle pro, lave-linge, sèche-linge, repassage' },
      { category: 'Bar & boissons', examples: 'Machines à café, tireuses, fontaines, cave à vin' },
      { category: 'Encaissement & IT', examples: 'PMS hôtelier, caisses, TPE, channel manager' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Cuisine professionnelle, froid & literie', why: "Matériel durable que vous comptez garder : le crédit-bail vous rend propriétaire au terme via l'option d'achat, tout en déduisant les loyers." },
      { solutionSlug: 'location-financiere', equipment: 'Téléviseurs, Wi-Fi, PMS & encaissement', why: "Matériel qui se renouvelle vite : la location financière finance 100 % sans engagement de rachat, idéal pour garder des chambres et des outils à jour." },
      { solutionSlug: 'lld', equipment: 'Blanchisserie & équipements à entretenir', why: "La LLD intègre la maintenance dans le loyer — zéro mauvaise surprise sur l'entretien d'un équipement sollicité en continu." },
      { solutionSlug: 'leaseback', equipment: 'Cuisine ou chambres déjà équipées', why: "Vous avez équipé votre cuisine ou rénové vos chambres comptant ? Le lease-back transforme cet actif en trésorerie immédiate sans cesser de l'utiliser." },
    ],
    examples: [
      { label: 'Cuisine professionnelle complète', total: '45 000 €', monthly: '≈ 1 215 €', duration: '48 mois' },
      { label: 'Rénovation de chambres (literie, TV, mobilier)', total: '80 000 €', monthly: '≈ 1 840 €', duration: '60 mois' },
    ],
    faq: [
      { q: "Peut-on financer une cuisine professionnelle en leasing ?", a: "Oui. Une cuisine professionnelle se finance très bien en crédit-bail ou en location financière : l'organisme achète le matériel chez votre fournisseur et vous le loue contre un loyer mensuel déductible, sans apport. En crédit-bail, vous devenez propriétaire au terme." },
      { q: "Peut-on financer la literie et l'équipement des chambres d'un hôtel ?", a: "Oui. Literie, matelas, mobilier de chambre, téléviseurs et équipements (Wi-Fi, coffres, climatisation) se financent en crédit-bail ou en location financière. Vous rénovez vos chambres en loyers mensuels déductibles, sans puiser dans votre trésorerie, et vous gardez un parc attractif pour vos clients." },
      { q: 'Le financement CHR tient-il compte de la saisonnalité ?', a: "Selon le contrat et le partenaire financeur, des loyers modulables ou des reports d'échéance en basse saison sont possibles. Everlease met en concurrence ses partenaires pour trouver la structure la plus adaptée à votre activité saisonnière." },
      { q: "Quel équipement d'hôtel ou de restaurant peut-on financer ?", a: "Pratiquement tout actif physique : cuisine professionnelle, matériel de froid, laverie et blanchisserie, mobilier et agencement, literie et mobilier de chambre, téléviseurs et réseau Wi-Fi, ainsi que les caisses et le PMS hôtelier. Les prestations de service (installation, conseil) ne sont en général pas finançables." },
      { q: 'Je viens d\'acheter ma cuisine ou de rénover mes chambres comptant, est-ce trop tard ?', a: "Non. Le lease-back (cession-bail) vous permet de vendre un équipement déjà installé à un financeur et de le reprendre en location : vous récupérez la trésorerie immobilisée tout en continuant à l'utiliser." },
    ],
    photos: {
      hero: { alt: "Cuisine professionnelle d'un établissement CHR en activité", hint: 'Photo banque d\'image : cuisine pro inox, chef en action — large format paysage' },
      equipment: { alt: 'Salle de restaurant aménagée avec mobilier et comptoir', hint: 'Photo : salle de restaurant chaleureuse, mobilier moderne' },
      ambiance: { alt: 'Façade et terrasse d\'un établissement CHR', hint: 'Photo : devanture / terrasse — mobilier visible', objectPosition: 'center bottom' },
    },
    related: ['commerce-retail', 'sante-cabinets-medicaux', 'industrie-production'],
  },
  {
    slug: 'sante-cabinets-medicaux',
    nav: 'Santé — Cabinets médicaux',
    name: 'Santé (cabinets médicaux et dentaires)',
    h1: "Financer le matériel médical de votre cabinet",
    metaTitle: "Financement matériel médical & dentaire pour cabinets",
    metaDescription:
      "Financez imagerie, fauteuil dentaire, autoclave et matériel de cabinet médical en crédit-bail ou location financière. Solutions adaptées à l'installation et à l'équipement des praticiens.",
    tagline:
      "Imagerie, fauteuil dentaire, autoclave, matériel de labo : équipez votre cabinet sans mobiliser votre épargne professionnelle.",
    intro:
      "Le matériel médical et dentaire compte parmi les plus coûteux à acquérir : un fauteuil dentaire équipé dépasse 35 000 €, un cône beam d'imagerie 3D peut atteindre 100 000 €. Pour un praticien qui s'installe ou modernise son cabinet, le financement locatif (crédit-bail médical, location financière) permet d'accéder à un plateau technique de pointe immédiatement, en loyers déductibles et sans puiser dans son apport personnel.",
    whyFinance:
      "S'installer ou rééquiper un cabinet médical demande un capital important, souvent au moment précis où la trésorerie du praticien est la plus fragile (début d'activité, remboursement de prêt d'installation). Le crédit-bail médical étale ce coût sur 4 à 5 ans, préserve la capacité d'emprunt pour les murs ou la patientèle, et permet de rester à la pointe technologique — un argument clé pour la qualité de soin et l'attractivité du cabinet.",
    equipment: [
      { category: 'Imagerie', examples: 'Radiologie, cone beam, panoramique, échographe' },
      { category: 'Dentaire', examples: 'Fauteuils, units, caméras intra-orales, CFAO' },
      { category: 'Stérilisation', examples: 'Autoclaves, thermosoudeuses, bacs à ultrasons' },
      { category: 'Laboratoire & analyse', examples: 'Centrifugeuses, analyseurs, microscopes' },
      { category: 'Kiné & rééducation', examples: 'Tables, appareils de physiothérapie, plateaux' },
      { category: 'Informatique de cabinet', examples: 'Logiciel métier, postes, serveurs, télétransmission' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Imagerie, fauteuil dentaire, autoclave', why: "Le crédit-bail médical est le standard du secteur : matériel durable à forte valeur que vous gardez, propriété au terme et loyers déductibles." },
      { solutionSlug: 'location-financiere', equipment: 'Informatique & logiciel de cabinet', why: "Pour le matériel informatique qui se renouvelle, la location financière évite l'obsolescence et finance 100 % sans rachat imposé." },
      { solutionSlug: 'leaseback', equipment: 'Plateau technique déjà acquis', why: "Un praticien établi peut céder son matériel à un financeur et le relouer pour dégager de la trésorerie — utile pour financer une nouvelle installation ou un associé." },
      { solutionSlug: 'lld', equipment: 'Équipements sous contrat de maintenance', why: "La LLD regroupe financement et maintenance dans un loyer unique, pratique pour des appareils dont l'entretien est critique." },
    ],
    examples: [
      { label: 'Fauteuil dentaire équipé', total: '38 000 €', monthly: '≈ 874 €', duration: '60 mois' },
      { label: "Cone beam (imagerie 3D)", total: '95 000 €', monthly: '≈ 2 185 €', duration: '60 mois' },
    ],
    faq: [
      { q: "Qu'est-ce que le crédit-bail médical ?", a: "Le crédit-bail médical est un financement locatif dédié aux équipements de santé : un établissement financier achète le matériel (imagerie, fauteuil dentaire, autoclave) et le loue au praticien, qui peut en devenir propriétaire au terme. Les loyers sont déductibles du résultat." },
      { q: 'Un jeune praticien qui s\'installe peut-il financer son matériel ?', a: "Oui, c'est même un cas typique. Le financement locatif permet de s'équiper sans apport et de préserver sa capacité d'emprunt pour l'installation (murs, droit de présentation). L'étude du dossier tient compte du projet d'installation." },
      { q: 'Quel matériel médical peut-on financer ?', a: "Imagerie (radio, cone beam, échographe), équipement dentaire (fauteuils, units, CFAO), stérilisation (autoclaves), matériel de laboratoire, équipement de kinésithérapie et l'informatique de cabinet." },
      { q: 'Le financement couvre-t-il l\'installation et la maintenance ?', a: "Le financement porte sur la valeur du matériel. La maintenance peut être intégrée via une formule LLD. L'installation peut parfois être incluse dans le montant financé selon le devis fournisseur." },
      { q: 'Crédit-bail ou location financière pour un cabinet ?', a: "Le crédit-bail convient au matériel durable et coûteux que vous gardez (imagerie, fauteuil). La location financière est préférable pour l'informatique et le logiciel, qui se renouvellent plus vite." },
    ],
    photos: {
      hero: { alt: 'Cabinet dentaire moderne avec fauteuil et équipement', hint: 'Photo banque d\'image : cabinet dentaire/médical lumineux, équipement de pointe — format paysage' },
      equipment: { alt: "Appareil d'imagerie médicale dans une salle dédiée", hint: 'Photo : scanner / cone beam / échographe en salle' },
      ambiance: { alt: 'Salle d\'attente et accueil d\'un cabinet médical', hint: 'Photo : accueil / salle d\'attente professionnelle' },
    },
    related: ['chr-hotellerie-restauration', 'industrie-production', 'commerce-retail'],
  },
  {
    slug: 'btp-construction',
    nav: 'BTP & construction',
    name: 'BTP et construction',
    h1: "Financer le matériel et les engins de votre entreprise du BTP",
    metaTitle: "Financement matériel BTP : engins, outillage, utilitaires",
    metaDescription:
      "Financez engins de chantier, échafaudages, outillage et flotte utilitaire de votre entreprise du bâtiment. Leasing BTP adapté aux délais de paiement et à l'activité par chantier.",
    tagline:
      "Engins, échafaudages, outillage, utilitaires : équipez vos chantiers sans assécher une trésorerie déjà sous tension.",
    intro:
      "Dans le bâtiment et les travaux publics, le matériel est lourd à financer — une mini-pelle dépasse 40 000 €, une flotte d'utilitaires plusieurs dizaines de milliers d'euros — alors que la trésorerie est régulièrement tendue par les longs délais de paiement clients. Le financement locatif (crédit-bail, LLD, location financière) permet d'équiper vos chantiers en loyers mensuels déductibles, calés sur l'usage réel du matériel, sans bloquer le cash dont vous avez besoin pour avancer la TVA et les salaires.",
    whyFinance:
      "Le BTP cumule deux contraintes de trésorerie : des investissements matériels élevés et des délais de paiement clients souvent longs. Immobiliser 40 ou 80 k€ dans un engin payé comptant aggrave ce décalage. Le leasing transforme l'achat en loyer, préserve la capacité d'emprunt pour le besoin en fonds de roulement, et permet d'adapter le parc à la charge de chantiers.",
    equipment: [
      { category: 'Engins de chantier', examples: 'Mini-pelles, chargeuses, nacelles, compacteurs' },
      { category: 'Élévation & accès', examples: 'Échafaudages, nacelles élévatrices, monte-charges' },
      { category: 'Manutention', examples: 'Chariots télescopiques, transpalettes, grues mobiles' },
      { category: 'Outillage & matériel', examples: 'Compresseurs, groupes électrogènes, bétonnières' },
      { category: 'Flotte utilitaire', examples: 'Fourgons, bennes, plateaux, véhicules de chantier' },
      { category: 'Mesure & sécurité', examples: 'Stations topo, lasers, équipements de protection collective' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Engins de chantier & matériel durable', why: "Pour un engin que vous exploiterez plusieurs années, le crédit-bail permet de devenir propriétaire au terme tout en déduisant les loyers." },
      { solutionSlug: 'lld', equipment: 'Flotte de véhicules utilitaires', why: "La LLD inclut entretien, assurance et assistance dans le loyer — idéal pour une flotte intensément sollicitée sur les chantiers." },
      { solutionSlug: 'location-financiere', equipment: 'Outillage & matériel à renouveler', why: "La location financière finance 100 % du matériel sans apport, pour s'équiper vite au démarrage d'un chantier." },
      { solutionSlug: 'leaseback', equipment: 'Parc d\'engins déjà détenu', why: "Le lease-back libère la trésorerie immobilisée dans des engins déjà payés — utile pour passer un creux de paiement ou financer un gros chantier." },
    ],
    examples: [
      { label: 'Mini-pelle', total: '42 000 €', monthly: '≈ 1 134 €', duration: '48 mois' },
      { label: 'Nacelle élévatrice', total: '28 000 €', monthly: '≈ 756 €', duration: '48 mois' },
    ],
    faq: [
      { q: 'Peut-on financer un engin de chantier en leasing ?', a: "Oui. Mini-pelles, nacelles, chariots télescopiques et autres engins se financent en crédit-bail ou en location financière : le financeur achète l'engin et vous le loue, avec option d'achat possible au terme en crédit-bail." },
      { q: 'Comment financer une flotte de véhicules utilitaires dans le BTP ?', a: "La LLD (Location Longue Durée) est la solution la plus adaptée à une flotte : le loyer intègre l'entretien, l'assurance et l'assistance, pour un budget tout compris et un parc toujours opérationnel." },
      { q: 'Le leasing BTP s\'adapte-t-il aux délais de paiement longs ?', a: "C'est justement son intérêt : en transformant l'achat en loyers mensuels, le leasing évite d'immobiliser une grosse somme alors que vos clients vous paient à 60 ou 90 jours. La capacité d'emprunt bancaire reste disponible pour le BFR." },
      { q: 'Quel matériel de chantier peut-on financer ?', a: "Engins de chantier, échafaudages et matériel d'élévation, manutention, outillage (compresseurs, groupes électrogènes), flotte utilitaire et équipements de mesure ou de sécurité." },
      { q: 'Peut-on dégager du cash sur des engins déjà achetés ?', a: "Oui, via le lease-back : vous cédez vos engins à un financeur et les reprenez en location, ce qui restaure immédiatement de la trésorerie sans interrompre leur usage sur les chantiers." },
    ],
    photos: {
      hero: { alt: 'Engin de chantier en activité sur un site de construction', hint: 'Photo banque d\'image : mini-pelle / chantier en action — format paysage' },
      equipment: { alt: 'Flotte de véhicules utilitaires d\'une entreprise du bâtiment', hint: 'Photo : fourgons / utilitaires alignés' },
      ambiance: { alt: 'Ouvriers et matériel sur un chantier', hint: 'Photo : équipe BTP au travail, échafaudage' },
    },
    related: ['industrie-production', 'transport-logistique', 'chr-hotellerie-restauration'],
  },
  {
    slug: 'commerce-retail',
    nav: 'Commerce & retail',
    name: 'Commerce et retail (magasins)',
    h1: "Financer l'agencement et l'équipement de votre magasin",
    metaTitle: "Financement agencement & équipement de magasin",
    metaDescription:
      "Financez agencement, mobilier, vitrines, caisses et matériel de votre magasin sans immobiliser votre trésorerie dans les murs. Solutions de leasing retail pour ouverture et rénovation.",
    tagline:
      "Agencement, mobilier, vitrines, caisses : ouvrez ou rénovez votre point de vente sans bloquer la trésorerie dans vos murs.",
    intro:
      "Ouvrir ou rénover un magasin mobilise un capital important en agencement, mobilier et matériel d'encaissement — souvent 40 à 80 k€ — alors que la trésorerie d'un commerce est déjà largement immobilisée dans le stock. Le financement locatif (location financière, crédit-bail) permet d'étaler ce coût en loyers déductibles, de garder du cash pour le stock et le fonds de roulement, et de renouveler régulièrement une décoration qui doit rester attractive.",
    whyFinance:
      "Un commerce immobilise déjà beaucoup de trésorerie dans ses stocks. Y ajouter le paiement comptant de l'agencement complet d'un point de vente fragilise le fonds de roulement, surtout à l'ouverture. Le leasing finance l'agencement et l'équipement en loyers, préserve la trésorerie pour le stock, et permet de rafraîchir régulièrement le magasin pour rester concurrentiel.",
    equipment: [
      { category: 'Agencement & mobilier', examples: 'Rayonnages, comptoirs, présentoirs, cabines' },
      { category: 'Vitrines & éclairage', examples: 'Vitrines, éclairage scénographique, signalétique' },
      { category: 'Encaissement', examples: 'Caisses tactiles, TPE, tiroirs, scanners code-barres' },
      { category: 'Froid (alimentaire)', examples: 'Vitrines réfrigérées, meubles positifs/négatifs' },
      { category: 'Sécurité', examples: 'Antivols, vidéosurveillance, portiques' },
      { category: 'Digital in-store', examples: 'Écrans, bornes, affichage dynamique' },
    ],
    solutionFit: [
      { solutionSlug: 'location-financiere', equipment: 'Agencement, mobilier, écrans, IT', why: "L'agencement et le matériel digital se renouvellent au rythme des concepts retail : la location financière finance 100 % sans engagement de rachat." },
      { solutionSlug: 'credit-bail', equipment: 'Mobilier durable & froid alimentaire', why: "Pour des équipements robustes que vous gardez longtemps, le crédit-bail permet d'en devenir propriétaire au terme." },
      { solutionSlug: 'leaseback', equipment: 'Agencement déjà financé sur fonds propres', why: "Vous avez agencé votre magasin comptant ? Le lease-back transforme cet investissement en trésorerie pour financer le stock ou un second point de vente." },
      { solutionSlug: 'lld', equipment: 'Matériel d\'encaissement & monétique', why: "La LLD permet de garder un parc de caisses et TPE à jour, services et support inclus." },
    ],
    examples: [
      { label: 'Agencement complet de magasin', total: '60 000 €', monthly: '≈ 1 380 €', duration: '60 mois' },
      { label: 'Parc caisses & TPE', total: '12 000 €', monthly: '≈ 408 €', duration: '36 mois' },
    ],
    faq: [
      { q: "Peut-on financer l'agencement d'un magasin en leasing ?", a: "Oui. L'agencement, le mobilier, les vitrines et l'éclairage d'un point de vente se financent en location financière ou en crédit-bail : le financeur prend en charge l'investissement et vous payez un loyer mensuel déductible, sans apport." },
      { q: 'Comment équiper un magasin sans bloquer la trésorerie du stock ?', a: "Le financement locatif est conçu pour ça : il couvre 100 % de l'agencement et de l'équipement en loyers étalés, ce qui laisse votre trésorerie disponible pour le stock et le fonds de roulement, particulièrement critiques à l'ouverture." },
      { q: 'Quel matériel de commerce peut-on financer ?', a: "Agencement et mobilier (rayonnages, comptoirs, présentoirs), vitrines et éclairage, matériel d'encaissement (caisses, TPE), froid alimentaire, systèmes de sécurité et affichage digital." },
      { q: 'Le leasing convient-il pour une rénovation de point de vente ?', a: "Tout à fait. Comme la décoration d'un magasin doit rester attractive, la location financière permet de rénover régulièrement en lissant le coût, sans repartir d'un gros décaissement à chaque refonte du concept." },
      { q: 'Peut-on financer plusieurs points de vente ?', a: "Oui. Le financement locatif s'adapte au déploiement d'un réseau : chaque ouverture peut être financée en loyers, et le lease-back d'un magasin existant peut aider à financer le suivant." },
    ],
    photos: {
      hero: { alt: 'Intérieur d\'un magasin moderne avec agencement et éclairage', hint: 'Photo banque d\'image : intérieur de boutique soignée, rayonnages, éclairage — format paysage' },
      equipment: { alt: 'Comptoir d\'encaissement avec caisse tactile', hint: 'Photo : comptoir / caisse moderne en magasin' },
      ambiance: { alt: 'Vitrine et devanture d\'un commerce', hint: 'Photo : vitrine attractive / devanture de magasin' },
    },
    related: ['chr-hotellerie-restauration', 'sante-cabinets-medicaux', 'transport-logistique'],
  },
  {
    slug: 'industrie-production',
    nav: 'Industrie & production',
    name: 'Industrie et production',
    h1: "Financer vos machines et lignes de production",
    metaTitle: "Financement machines industrielles & production",
    metaDescription:
      "Financez machines-outils, CNC, robotique et lignes de production en crédit-bail ou lease-back. Modernisez votre outil industriel sans immobiliser votre capital.",
    tagline:
      "Machines-outils, CNC, robotique, lignes de production : modernisez votre outil industriel sans immobiliser votre capital.",
    intro:
      "Dans l'industrie, l'investissement productif se chiffre vite en centaines de milliers d'euros — un centre d'usinage CNC peut dépasser 180 000 €. Financer ces machines en crédit-bail ou en lease-back permet d'aligner le coût de l'équipement sur les revenus qu'il génère, de moderniser ou d'automatiser sans ponctionner la trésorerie, et de devenir propriétaire au terme d'un actif amorti.",
    whyFinance:
      "Un investissement industriel est structurant et long à amortir. Le payer comptant immobilise un capital considérable et entame la capacité à investir ailleurs (R&D, recrutement, BFR). Le crédit-bail aligne le loyer sur la durée de vie productive de la machine ; le lease-back permet de dégager du cash sur un parc déjà détenu pour financer la croissance ou l'automatisation.",
    equipment: [
      { category: 'Usinage & machines-outils', examples: 'Centres d\'usinage CNC, tours, fraiseuses, rectifieuses' },
      { category: 'Robotique & automatisation', examples: 'Robots, cobots, lignes automatisées, convoyeurs' },
      { category: 'Fabrication additive', examples: 'Imprimantes 3D industrielles, frittage' },
      { category: 'Transformation', examples: 'Presses, découpe laser, plieuses, soudure' },
      { category: 'Manutention & énergie', examples: 'Ponts roulants, compresseurs, groupes' },
      { category: 'Contrôle & IT industriel', examples: 'Métrologie, supervision, MES, capteurs IoT' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Machines-outils & lignes de production', why: "Le crédit-bail est le standard de l'investissement industriel : il finance des machines durables et coûteuses avec option d'achat au terme et loyers déductibles." },
      { solutionSlug: 'leaseback', equipment: 'Parc machines déjà détenu', why: "Le lease-back libère le capital immobilisé dans vos machines existantes pour financer une nouvelle ligne, l'automatisation ou la croissance." },
      { solutionSlug: 'location-financiere', equipment: 'Contrôle, métrologie & IT industriel', why: "Pour les systèmes informatiques et de contrôle qui évoluent vite, la location financière évite l'obsolescence." },
      { solutionSlug: 'lld', equipment: 'Équipements à maintenance lourde', why: "La LLD intègre la maintenance, pertinente pour des équipements dont l'immobilisation coûte cher en production." },
    ],
    examples: [
      { label: "Centre d'usinage CNC", total: '180 000 €', monthly: '≈ 4 140 €', duration: '60 mois' },
      { label: 'Robot collaboratif (cobot)', total: '55 000 €', monthly: '≈ 1 485 €', duration: '48 mois' },
    ],
    faq: [
      { q: 'Comment financer une machine-outil ou un centre d\'usinage ?', a: "Le crédit-bail est la solution de référence : l'établissement financier achète la machine et vous la loue sur 4 à 5 ans, avec une option d'achat au terme. Les loyers sont déductibles et l'investissement est aligné sur la production qu'il génère." },
      { q: "Qu'est-ce que le lease-back industriel ?", a: "Le lease-back consiste à vendre une machine que vous possédez déjà à un financeur, puis à la reprendre en location. Vous récupérez immédiatement la trésorerie immobilisée tout en continuant à produire — un levier pour financer l'automatisation ou la croissance." },
      { q: 'Peut-on financer une ligne de production complète ?', a: "Oui. Une ligne de production, y compris robotique et automatisation, peut être financée en crédit-bail. Le montant et la durée sont calés sur la valeur des équipements et leur durée de vie productive." },
      { q: 'Le financement aide-t-il à automatiser un atelier ?', a: "Oui : le crédit-bail permet d'investir dans la robotique et les cobots sans décaissement initial, et le lease-back de financer l'automatisation à partir de la valeur du parc machines existant." },
      { q: 'Quelle durée de financement pour du matériel industriel ?', a: "Généralement 48 à 60 mois, alignés sur la durée d'amortissement et la vie productive de la machine. Une machine très durable peut justifier la durée maximale pour alléger le loyer mensuel." },
    ],
    photos: {
      hero: { alt: 'Machine-outil CNC en fonctionnement dans un atelier', hint: 'Photo banque d\'image : centre d\'usinage / atelier industriel — format paysage' },
      equipment: { alt: 'Robot industriel sur une ligne de production', hint: 'Photo : bras robotisé / cobot en production' },
      ambiance: { alt: "Atelier de production industrielle", hint: 'Photo : vue d\'ensemble d\'un atelier / usine' },
    },
    related: ['btp-construction', 'transport-logistique', 'sante-cabinets-medicaux'],
  },
  {
    slug: 'transport-logistique',
    nav: 'Transport & logistique',
    name: 'Transport et logistique',
    h1: "Financer votre flotte et vos équipements logistiques",
    metaTitle: "Financement flotte & matériel transport-logistique",
    metaDescription:
      "Financez flotte utilitaire, chariots élévateurs, racks et matériel d'entrepôt en LLD ou crédit-bail. Solutions de leasing transport-logistique avec entretien inclus.",
    tagline:
      "Flotte, chariots élévateurs, racks, manutention : équipez vos tournées et vos entrepôts avec un budget mensuel maîtrisé.",
    intro:
      "Dans le transport et la logistique, la flotte et le matériel de manutention représentent le premier poste d'investissement et un coût d'entretien permanent. Le financement locatif — surtout la LLD — permet de rouler et d'opérer vos entrepôts avec un loyer tout compris (financement + entretien), de renouveler la flotte au rythme des normes, et de préserver la trésorerie pour le carburant et les salaires.",
    whyFinance:
      "Une flotte mobilise énormément de capital et génère des coûts d'entretien continus, tout en devant être renouvelée régulièrement (usure, normes d'émission). Acheter comptant immobilise un cash crucial et expose au risque de revente. La LLD transforme tout cela en un loyer prévisible incluant l'entretien ; le crédit-bail convient au matériel de manutention durable ; le lease-back libère du cash sur une flotte déjà détenue.",
    equipment: [
      { category: 'Flotte routière', examples: 'Utilitaires, poids lourds, fourgons frigorifiques' },
      { category: 'Remorques & attelages', examples: 'Bennes, plateaux, remorques frigorifiques' },
      { category: 'Manutention', examples: 'Chariots élévateurs, gerbeurs, transpalettes électriques' },
      { category: 'Entrepôt & stockage', examples: 'Racks, rayonnages, quais, portes sectionnelles' },
      { category: 'Préparation de commandes', examples: 'Convoyeurs, systèmes de tri, scanners' },
      { category: 'IT & WMS', examples: 'Logiciel d\'entrepôt, terminaux, télématique embarquée' },
    ],
    solutionFit: [
      { solutionSlug: 'lld', equipment: 'Flotte de véhicules & poids lourds', why: "La LLD est la référence pour une flotte : loyer tout compris (entretien, assurance, assistance), renouvellement régulier et zéro risque de revente." },
      { solutionSlug: 'credit-bail', equipment: 'Chariots élévateurs & matériel de manutention', why: "Pour le matériel de manutention durable que vous exploitez longtemps, le crédit-bail permet d'en devenir propriétaire au terme." },
      { solutionSlug: 'location-financiere', equipment: 'Racks, IT et systèmes d\'entrepôt', why: "La location financière finance l'aménagement d'entrepôt et les systèmes informatiques sans apport et sans engagement de rachat." },
      { solutionSlug: 'leaseback', equipment: 'Flotte ou parc de chariots déjà détenu', why: "Le lease-back dégage de la trésorerie à partir d'une flotte ou d'un parc de manutention déjà payés, sans en interrompre l'exploitation." },
    ],
    examples: [
      { label: 'Flotte de 3 véhicules utilitaires', total: '90 000 €', monthly: '≈ 2 430 €', duration: '48 mois' },
      { label: 'Chariot élévateur', total: '32 000 €', monthly: '≈ 864 €', duration: '48 mois' },
    ],
    faq: [
      { q: 'Quelle solution pour financer une flotte de véhicules ?', a: "La LLD (Location Longue Durée) est la mieux adaptée à une flotte : le loyer intègre l'entretien, l'assurance et l'assistance, la flotte est renouvelée régulièrement et vous n'assumez pas le risque de revente." },
      { q: 'Peut-on financer des chariots élévateurs et du matériel d\'entrepôt ?', a: "Oui. Les chariots élévateurs et la manutention durable se financent en crédit-bail (avec option d'achat) ; les racks, rayonnages et systèmes d'entrepôt se financent en location financière." },
      { q: 'Comment gérer le renouvellement de flotte lié aux normes ?', a: "La LLD facilite le respect des normes d'émission : en fin de contrat, vous restituez et reprenez des véhicules conformes, sans vous soucier de la revente d'un parc vieillissant." },
      { q: 'Le lease-back fonctionne-t-il sur une flotte existante ?', a: "Oui. Vous cédez votre flotte ou votre parc de chariots à un financeur et les reprenez en location : la trésorerie immobilisée est restaurée sans interrompre vos tournées ni votre activité d'entrepôt." },
      { q: 'Quel matériel logistique peut-on financer ?', a: "Flotte routière et remorques, matériel de manutention (chariots, gerbeurs, transpalettes), aménagement d'entrepôt (racks, quais), systèmes de préparation de commandes et l'IT logistique (WMS, terminaux, télématique)." },
    ],
    photos: {
      hero: { alt: 'Flotte de camions et utilitaires d\'une entreprise de transport', hint: 'Photo banque d\'image : flotte de poids lourds / utilitaires — format paysage' },
      equipment: { alt: "Chariot élévateur dans un entrepôt logistique", hint: 'Photo : chariot élévateur / manutention en entrepôt', objectPosition: 'center bottom' },
      ambiance: { alt: 'Entrepôt logistique avec racks de stockage', hint: 'Photo : entrepôt, racks, préparation de commandes' },
    },
    related: ['btp-construction', 'industrie-production', 'commerce-retail'],
  },
  {
    slug: 'boulangerie-patisserie',
    nav: 'Boulangerie-pâtisserie',
    name: 'Boulangerie-pâtisserie',
    h1: "Financer les équipements de votre boulangerie-pâtisserie",
    metaTitle: "Financement équipement boulangerie-pâtisserie",
    metaDescription:
      "Financez four, pétrin, chambre froide et vitrines de votre boulangerie-pâtisserie sans vider votre trésorerie. Crédit-bail et location financière adaptés au fournil et au magasin.",
    tagline:
      "Four, pétrin, chambre froide, vitrines : équipez votre fournil et votre laboratoire sans immobiliser votre trésorerie.",
    intro:
      "Ouvrir ou rééquiper une boulangerie-pâtisserie demande un investissement lourd : un four professionnel dépasse souvent 30 000 €, et l'ensemble fournil, laboratoire et vitrines de magasin se chiffre rapidement en dizaines de milliers d'euros. Le financement locatif (crédit-bail, location financière) permet d'étaler ce coût en loyers mensuels déductibles, de préserver votre trésorerie pour la farine, les salaires et le quotidien, et de devenir propriétaire d'un matériel que vous garderez de longues années.",
    whyFinance:
      "Le matériel de boulangerie est structurant et durable : un four ou un pétrin s'utilise quinze à vingt ans. Le payer comptant immobilise un capital considérable au pire moment — l'installation ou la reprise. Le crédit-bail aligne le coût sur la durée de vie du matériel et vous rend propriétaire au terme ; la location financière convient au matériel de magasin et d'encaissement qui se renouvelle plus vite. Dans les deux cas, vous gardez votre capacité d'emprunt pour le fonds de roulement.",
    equipment: [
      { category: 'Cuisson', examples: 'Fours à soles, ventilés, rotatifs, chambres de cuisson' },
      { category: 'Pétrissage & façonnage', examples: 'Pétrins, batteurs, diviseuses, façonneuses, laminoirs' },
      { category: 'Froid & fermentation', examples: 'Chambres froides, chambres de pousse, surgélateurs' },
      { category: 'Laboratoire pâtisserie', examples: 'Tempéreuses chocolat, sorbetières, étuves' },
      { category: 'Magasin & vitrines', examples: 'Vitrines réfrigérées, agencement, mobilier, enseigne' },
      { category: 'Encaissement & pesage', examples: 'Caisses, TPE, balances, logiciel de gestion' },
    ],
    solutionFit: [
      { solutionSlug: 'credit-bail', equipment: 'Four, pétrin & matériel de fournil', why: "Matériel durable que vous garderez des années : le crédit-bail vous rend propriétaire au terme via l'option d'achat, tout en déduisant les loyers." },
      { solutionSlug: 'location-financiere', equipment: 'Vitrines, encaissement & agencement magasin', why: "Matériel de magasin qui se rafraîchit régulièrement : la location financière finance 100 % sans engagement de rachat." },
      { solutionSlug: 'lld', equipment: 'Froid & équipements à entretenir', why: "La LLD intègre la maintenance dans le loyer — utile pour un froid sollicité en continu où la panne coûte cher." },
      { solutionSlug: 'leaseback', equipment: 'Fournil déjà équipé et payé', why: "Vous avez équipé votre fournil comptant ? Le lease-back transforme cet actif en trésorerie immédiate sans cesser de produire." },
    ],
    examples: [
      { label: 'Four + pétrin de fournil', total: '45 000 €', monthly: '≈ 1 215 €', duration: '48 mois' },
      { label: 'Agencement magasin & vitrines réfrigérées', total: '30 000 €', monthly: '≈ 810 €', duration: '48 mois' },
    ],
    faq: [
      { q: "Peut-on financer un four de boulangerie en leasing ?", a: "Oui. Un four professionnel se finance très bien en crédit-bail : l'établissement financier l'achète chez votre fournisseur et vous le loue contre un loyer mensuel déductible, sans apport. Au terme, vous levez l'option d'achat pour en devenir propriétaire." },
      { q: 'Crédit-bail ou location financière pour une boulangerie ?', a: "Le crédit-bail convient au matériel de fournil durable (four, pétrin, chambre froide) que vous comptez garder et posséder. La location financière est préférable pour le matériel de magasin et d'encaissement, qui se renouvelle plus vite." },
      { q: "Peut-on financer l'équipement d'un laboratoire de pâtisserie ?", a: "Oui : tempéreuses à chocolat, batteurs, laminoirs, sorbetières, étuves et froid se financent en crédit-bail ou en location financière, au même titre que le matériel de boulangerie." },
      { q: 'Comment financer la reprise d\'une boulangerie ?', a: "Le matériel d'une boulangerie reprise peut être financé en crédit-bail, et un matériel déjà payé peut être refinancé en lease-back pour dégager de la trésorerie. Everlease met en concurrence ses partenaires pour structurer l'opération." },
      { q: 'Faut-il un apport pour équiper sa boulangerie ?', a: "Non, le financement locatif couvre 100 % de la valeur du matériel. Vous préservez votre trésorerie pour la matière première, les salaires et le fonds de roulement." },
    ],
    photos: {
      hero: { alt: "Fournil de boulangerie avec four professionnel", hint: 'Photo banque d\'image : fournil / boulanger devant le four — format paysage' },
      equipment: { alt: 'Vitrine et magasin de boulangerie-pâtisserie', hint: 'Photo : vitrine de boulangerie garnie, magasin' },
      ambiance: { alt: 'Devanture d\'une boulangerie-pâtisserie', hint: 'Photo : devanture / enseigne de boulangerie' },
    },
    related: ['chr-hotellerie-restauration', 'commerce-retail', 'sante-cabinets-medicaux'],
  },
  {
    slug: 'salles-de-sport-fitness',
    nav: 'Salles de sport / fitness',
    name: 'Salles de sport & fitness',
    h1: "Financer l'équipement de votre salle de sport",
    metaTitle: "Financement équipement salle de sport & fitness",
    metaDescription:
      "Financez cardio, musculation, vestiaires et matériel de récupération de votre salle de sport sans bloquer votre trésorerie. Location financière et crédit-bail adaptés au fitness.",
    tagline:
      "Cardio, musculation, vestiaires : équipez votre salle sans bloquer votre trésorerie et renouvelez le parc au rythme des tendances.",
    intro:
      "Ouvrir une salle de sport mobilise un parc d'équipements lourd — un plateau cardio et musculation complet dépasse souvent 80 000 € — pour un matériel soumis à un usage intensif et à des tendances qui évoluent vite. Le financement locatif (location financière, crédit-bail) permet d'équiper et de renouveler votre salle en loyers mensuels déductibles, alignés sur vos revenus d'abonnement récurrents, sans immobiliser un capital énorme à l'ouverture.",
    whyFinance:
      "Un club de fitness vit d'abonnements récurrents mais doit investir massivement d'un coup pour ouvrir, puis renouveler un parc usé par un usage intensif. Payer comptant fragilise la trésorerie au démarrage et oblige à garder du matériel vieillissant. Le leasing transforme ce capex en loyer mensuel adossé à vos revenus, garde votre salle attractive et votre capacité bancaire intacte pour ouvrir d'autres sites.",
    equipment: [
      { category: 'Cardio-training', examples: 'Tapis de course, vélos, elliptiques, rameurs' },
      { category: 'Musculation', examples: 'Machines guidées, poids libres, racks, poulies' },
      { category: 'Cross-training & fonctionnel', examples: 'Rigs, kettlebells, médecine-balls, plateformes' },
      { category: 'Récupération & bien-être', examples: 'Sauna, cryothérapie, massage, hammam' },
      { category: 'Vestiaires & agencement', examples: 'Casiers, mobilier, revêtements, miroirs' },
      { category: 'Accueil & gestion', examples: 'Contrôle d\'accès, logiciel de gestion, bornes' },
    ],
    solutionFit: [
      { solutionSlug: 'location-financiere', equipment: 'Parc cardio & matériel à renouveler', why: "Le matériel suit les tendances et s'use vite : la location financière finance 100 % sans engagement de rachat, idéal pour garder une salle moderne." },
      { solutionSlug: 'credit-bail', equipment: 'Musculation & équipements durables', why: "Pour le matériel robuste que vous gardez longtemps, le crédit-bail permet d'en devenir propriétaire au terme tout en déduisant les loyers." },
      { solutionSlug: 'lld', equipment: 'Parc soumis à usage intensif', why: "La LLD intègre la maintenance — précieux pour un parc sollicité toute la journée où l'indisponibilité d'une machine se voit." },
      { solutionSlug: 'leaseback', equipment: 'Salle déjà équipée', why: "Vous avez équipé votre salle comptant ? Le lease-back dégage de la trésorerie pour ouvrir un nouveau site ou renouveler le parc." },
    ],
    examples: [
      { label: 'Plateau cardio + musculation complet', total: '90 000 €', monthly: '≈ 2 070 €', duration: '60 mois' },
      { label: 'Espace fonctionnel & récupération', total: '30 000 €', monthly: '≈ 810 €', duration: '48 mois' },
    ],
    faq: [
      { q: "Peut-on financer l'équipement d'une salle de sport en leasing ?", a: "Oui. Cardio, musculation, cross-training et matériel de récupération se financent en location financière ou en crédit-bail : l'organisme achète le matériel et vous le loue contre un loyer mensuel déductible, sans apport." },
      { q: 'Location financière ou crédit-bail pour une salle de fitness ?', a: "La location financière convient au matériel qui suit les tendances et s'use vite (parc cardio), pour rester moderne sans engagement de rachat. Le crédit-bail convient au matériel de musculation durable que vous gardez et souhaitez posséder." },
      { q: "Comment financer l'ouverture d'une salle de sport ?", a: "Le financement locatif couvre 100 % du parc d'équipements en loyers étalés, ce qui évite d'immobiliser un capital énorme à l'ouverture et adosse le coût à vos revenus d'abonnement." },
      { q: 'Peut-on financer une franchise de fitness ?', a: "Oui. Le financement locatif s'adapte aux concepts de franchise : chaque ouverture peut être financée en loyers, et le lease-back d'une salle existante peut aider à financer la suivante." },
      { q: 'La maintenance du matériel est-elle finançable ?', a: "Via une formule LLD, l'entretien du parc peut être intégré au loyer — utile pour un matériel sollicité en continu où la disponibilité est un argument commercial." },
    ],
    photos: {
      hero: { alt: "Salle de sport équipée en cardio et musculation", hint: 'Photo banque d\'image : salle de sport moderne, machines — format paysage' },
      equipment: { alt: 'Zone de musculation avec machines guidées', hint: 'Photo : plateau musculation / cross-training' },
      ambiance: { alt: 'Intérieur d\'un club de fitness', hint: 'Photo : ambiance club de sport, vue d\'ensemble' },
    },
    related: ['commerce-retail', 'sante-cabinets-medicaux', 'chr-hotellerie-restauration'],
  },
  {
    slug: 'securite-surveillance',
    nav: 'Sécurité & surveillance',
    name: 'Sécurité & surveillance',
    h1: "Financer vos équipements de sécurité et de surveillance",
    metaTitle: "Financement vidéosurveillance & équipement de sécurité",
    metaDescription:
      "Financez vidéosurveillance, alarmes et contrôle d'accès sans immobiliser de capital. Location financière adaptée au déploiement multi-sites et au renouvellement d'un parc technologique.",
    tagline:
      "Vidéosurveillance, alarmes, contrôle d'accès : déployez vos systèmes de sécurité sans immobiliser de capital, avec un parc toujours à jour.",
    intro:
      "Les équipements de sécurité — vidéosurveillance IP, alarmes, contrôle d'accès — évoluent vite (caméras intelligentes, analyse par IA) et se déploient souvent sur plusieurs sites, ce qui en fait un investissement lourd et vite obsolète. Le financement locatif, et en particulier la location financière, permet d'équiper et de renouveler vos systèmes en loyers mensuels déductibles, sans immobiliser de capital ni rester avec un parc dépassé.",
    whyFinance:
      "La sécurité est un domaine technologique : une installation de vidéosurveillance perd vite en performance face aux nouvelles caméras et aux exigences réglementaires (RGPD). Acheter comptant un parc multi-sites mobilise un capital important pour un matériel qu'il faudra remplacer. La location financière lisse l'investissement, finance 100 % sans rachat imposé, et permet de garder un dispositif à l'état de l'art — un enjeu autant pour les entreprises qui s'équipent que pour les installateurs qui déploient chez leurs clients.",
    equipment: [
      { category: 'Vidéosurveillance', examples: 'Caméras IP, dômes, enregistreurs (NVR), stockage' },
      { category: 'Alarme & intrusion', examples: 'Détecteurs, centrales, sirènes, télésurveillance' },
      { category: 'Contrôle d\'accès', examples: 'Badges, biométrie, interphonie, serrures connectées' },
      { category: 'Sûreté périmétrique', examples: 'Portiques, barrières, bornes, tourniquets' },
      { category: 'Supervision', examples: 'Logiciels VMS, postes de supervision, écrans' },
      { category: 'Réseau & stockage', examples: 'Serveurs, baies, switches, onduleurs' },
    ],
    solutionFit: [
      { solutionSlug: 'location-financiere', equipment: 'Caméras, alarmes & matériel technologique', why: "Matériel à obsolescence rapide : la location financière finance 100 % sans engagement de rachat et permet de renouveler le parc régulièrement." },
      { solutionSlug: 'credit-bail', equipment: 'Infrastructure durable (réseau, périmétrique)', why: "Pour les éléments structurants et durables, le crédit-bail permet d'en devenir propriétaire au terme." },
      { solutionSlug: 'lld', equipment: 'Dispositifs avec supervision & maintenance', why: "La LLD intègre la maintenance et la supervision dans le loyer — pertinent pour un dispositif critique qui doit rester opérationnel." },
      { solutionSlug: 'leaseback', equipment: 'Parc de sécurité déjà installé', why: "Le lease-back dégage de la trésorerie à partir d'un parc déjà déployé, sans en interrompre l'exploitation." },
    ],
    examples: [
      { label: 'Vidéosurveillance multi-sites', total: '40 000 €', monthly: '≈ 1 080 €', duration: '48 mois' },
      { label: "Contrôle d'accès + alarme", total: '18 000 €', monthly: '≈ 612 €', duration: '36 mois' },
    ],
    faq: [
      { q: 'Peut-on financer une installation de vidéosurveillance ?', a: "Oui. Caméras IP, enregistreurs, stockage et supervision se financent en location financière : l'organisme achète le matériel et vous le loue contre un loyer mensuel déductible, sans apport, avec la possibilité de renouveler au terme." },
      { q: 'Pourquoi la location financière pour la sécurité ?', a: "Parce que le matériel de sécurité évolue vite : la location financière finance 100 % sans engagement de rachat, ce qui permet de garder un dispositif à jour (nouvelles caméras, IA, conformité) plutôt que de rester avec un parc dépassé acheté comptant." },
      { q: 'Un installateur de sécurité peut-il financer le matériel de ses clients ?', a: "Oui, le financement locatif est un argument commercial pour les intégrateurs : il permet de proposer au client un loyer mensuel plutôt qu'un gros décaissement. Everlease accompagne ce type de montage." },
      { q: 'Peut-on financer un déploiement multi-sites ?', a: "Tout à fait. Un parc déployé sur plusieurs sites se finance en une seule opération locative, en loyers étalés, sans immobiliser de trésorerie site par site." },
      { q: 'Peut-on refinancer un parc de sécurité existant ?', a: "Oui, via le lease-back : vous cédez un parc déjà installé à un financeur et le reprenez en location, ce qui restaure de la trésorerie sans interrompre la protection de vos sites." },
    ],
    photos: {
      hero: { alt: "Caméras de vidéosurveillance sur un site professionnel", hint: 'Photo banque d\'image : caméras de surveillance / centre de supervision — format paysage' },
      equipment: { alt: "Poste de supervision et écrans de vidéosurveillance", hint: 'Photo : mur d\'écrans / supervision sécurité' },
      ambiance: { alt: "Système de contrôle d'accès à l'entrée d'un bâtiment", hint: 'Photo : contrôle d\'accès / badge / portique' },
    },
    related: ['commerce-retail', 'audiovisuel-production', 'transport-logistique'],
  },
  {
    slug: 'audiovisuel-production',
    nav: 'Audiovisuel & production',
    name: 'Audiovisuel & production',
    h1: "Financer votre matériel audiovisuel et de production",
    metaTitle: "Financement matériel audiovisuel & production",
    metaDescription:
      "Financez caméras, son, éclairage et matériel de post-production sans immobiliser votre trésorerie. Location financière adaptée aux studios, sociétés de production et créateurs.",
    tagline:
      "Caméras, son, éclairage, drones : équipez votre studio ou votre activité de production avec un matériel toujours à la pointe.",
    intro:
      "Le matériel audiovisuel est coûteux et se renouvelle vite : un kit de captation professionnel (caméras, optiques, son) dépasse facilement 30 000 €, et rester à la pointe est une exigence de vos clients. Le financement locatif, et notamment la location financière, permet d'équiper et de renouveler votre matériel en loyers mensuels déductibles, sans immobiliser de trésorerie et sans porter le risque d'un parc qui se déprécie vite.",
    whyFinance:
      "Studios, sociétés de production, photographes et vidéastes vivent de projets ponctuels mais doivent investir dans un matériel cher qui évolue à chaque génération. Payer comptant immobilise la trésorerie et expose à une décote rapide. La location financière transforme l'achat en loyer, finance 100 % du matériel, et permet de renouveler caméras et optiques au rythme des besoins — sans gérer la revente d'un parc déprécié.",
    equipment: [
      { category: 'Captation vidéo', examples: 'Caméras, optiques, drones, stabilisateurs' },
      { category: 'Son & prise de son', examples: 'Micros, enregistreurs, mixage, monitoring' },
      { category: 'Éclairage', examples: 'Projecteurs LED, structures, gélatines, pieds' },
      { category: 'Post-production', examples: 'Stations de montage, écrans calibrés, stockage' },
      { category: 'Studio & plateau', examples: 'Fonds, machinerie, rails, fer à fond' },
      { category: 'Diffusion & streaming', examples: 'Régie, encodeurs, mélangeurs, captation live' },
    ],
    solutionFit: [
      { solutionSlug: 'location-financiere', equipment: 'Caméras, optiques & matériel à renouveler', why: "Matériel coûteux qui se déprécie vite : la location financière finance 100 % sans engagement de rachat, idéal pour rester équipé à la pointe." },
      { solutionSlug: 'credit-bail', equipment: 'Équipements de studio durables', why: "Pour le matériel de studio que vous gardez longtemps (éclairage, machinerie), le crédit-bail permet d'en devenir propriétaire au terme." },
      { solutionSlug: 'lld', equipment: 'Parc à entretenir & maintenir', why: "La LLD intègre la maintenance — utile pour un matériel sollicité sur les tournages où la panne bloque la production." },
      { solutionSlug: 'leaseback', equipment: 'Parc de matériel déjà acquis', why: "Le lease-back dégage de la trésorerie à partir d'un parc déjà acheté, sans en interrompre l'usage sur vos projets." },
    ],
    examples: [
      { label: 'Kit captation (caméras, optiques, son)', total: '35 000 €', monthly: '≈ 945 €', duration: '48 mois' },
      { label: 'Éclairage + régie de studio', total: '22 000 €', monthly: '≈ 594 €', duration: '48 mois' },
    ],
    faq: [
      { q: 'Peut-on financer du matériel audiovisuel en leasing ?', a: "Oui. Caméras, optiques, son, éclairage et stations de post-production se financent en location financière : l'organisme achète le matériel et vous le loue contre un loyer mensuel déductible, sans apport, avec renouvellement possible au terme." },
      { q: 'Pourquoi la location financière pour la production audiovisuelle ?', a: "Parce que le matériel se déprécie vite et évolue à chaque génération : la location financière finance 100 % sans rachat imposé, ce qui permet de renouveler caméras et optiques sans porter le risque de revente d'un parc déprécié." },
      { q: 'Un photographe ou vidéaste indépendant peut-il financer son matériel ?', a: "Oui. Le financement locatif s'adresse aussi aux indépendants et petites structures : il préserve la trésorerie et lisse l'investissement dans un matériel professionnel coûteux." },
      { q: 'Peut-on financer un studio complet ?', a: "Oui : captation, son, éclairage, plateau et post-production peuvent être financés en une seule opération locative, en loyers étalés. Le matériel durable de studio peut aussi passer en crédit-bail." },
      { q: 'Peut-on refinancer un parc de matériel déjà acheté ?', a: "Oui, via le lease-back : vous cédez votre matériel à un financeur et le reprenez en location, ce qui restaure de la trésorerie sans interrompre vos tournages." },
    ],
    photos: {
      hero: { alt: "Tournage en studio avec caméra et éclairage", hint: 'Photo banque d\'image : plateau de tournage / caméra — format paysage' },
      equipment: { alt: "Station de montage et post-production", hint: 'Photo : poste de montage / écrans calibrés' },
      ambiance: { alt: "Plateau audiovisuel avec éclairage de studio", hint: 'Photo : studio, éclairage, ambiance production' },
    },
    related: ['securite-surveillance', 'commerce-retail', 'transport-logistique'],
  },
]

export function getSector(slug: string): Sector | undefined {
  return SECTORS.find((s) => s.slug === slug)
}

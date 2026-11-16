// Familles et types de matériel : la référence unique pour l'éligibilité des leasers, le barème,
// l'analyse IA et le matching. Même liste que le gabarit envoyé aux leasers
// (seela-bos/Output/everlease-bareme-grenke.xlsx) : 12 familles, 39 types.
// Les identifiants (slug) sont stockés en base : ne jamais les renommer, en ajouter.

export type EquipmentType = { slug: string; label: string; examples: string }
export type EquipmentFamily = { slug: string; label: string; types: EquipmentType[] }

export const EQUIPMENT_FAMILIES: EquipmentFamily[] = [
  {
    slug: 'informatique', label: 'Informatique & bureautique', types: [
      { slug: 'postes-serveurs', label: 'Postes, serveurs & périphériques', examples: 'PC, portables, serveurs, imprimantes, copieurs' },
      { slug: 'reseau-stockage', label: 'Réseau & stockage', examples: 'Switchs, Wi-Fi, NAS, baies' },
      { slug: 'encaissement', label: 'Encaissement & monétique', examples: 'Caisses, TPE, balances, bornes de commande' },
      { slug: 'logiciels-licences', label: 'Logiciels & licences', examples: 'Logiciel métier, licences (part immatérielle)' },
    ],
  },
  {
    slug: 'telephonie', label: 'Téléphonie', types: [
      { slug: 'telephonie-standard', label: 'Téléphonie & standard', examples: 'IPBX, postes fixes, visio' },
      { slug: 'smartphones-tablettes', label: 'Smartphones & tablettes', examples: 'Flottes mobiles' },
    ],
  },
  {
    slug: 'audiovisuel', label: 'Audiovisuel & affichage', types: [
      { slug: 'affichage-ecrans', label: 'Affichage dynamique & écrans', examples: "Écrans, murs d'images, TV hôtelières" },
      { slug: 'son-image-studio', label: 'Son, image & studio', examples: 'Caméras, prise de son, éclairage, plateau' },
      { slug: 'post-production', label: 'Post-production & diffusion', examples: 'Stations de montage, régie, streaming' },
    ],
  },
  {
    slug: 'mobilier', label: 'Mobilier & agencement', types: [
      { slug: 'mobilier-bureau', label: 'Mobilier de bureau', examples: 'Bureaux, sièges, cloisons' },
      { slug: 'agencement-chr-magasin', label: 'Agencement CHR & magasin', examples: 'Mobilier de salle, comptoirs, rayonnages de vente' },
      { slug: 'vitrines-eclairage', label: 'Vitrines & éclairage', examples: 'Vitrines, éclairage commercial' },
      { slug: 'chambres-literie', label: 'Chambres & literie', examples: 'Literie, mobilier de chambre (hôtellerie)' },
    ],
  },
  {
    slug: 'medical', label: 'Médical & santé', types: [
      { slug: 'imagerie', label: 'Imagerie', examples: 'Radiologie, échographie, panoramique dentaire' },
      { slug: 'dentaire', label: 'Dentaire', examples: 'Fauteuils, CFAO, scanners intra-oraux' },
      { slug: 'sterilisation-laboratoire', label: 'Stérilisation & laboratoire', examples: 'Autoclaves, analyseurs' },
      { slug: 'kine-reeducation', label: 'Kiné & rééducation', examples: "Tables, appareils d'électrothérapie" },
    ],
  },
  {
    slug: 'chr', label: 'CHR & métiers de bouche', types: [
      { slug: 'cuisine-pro', label: 'Cuisine professionnelle', examples: 'Fours, pianos, hottes, extracteurs, plonge' },
      { slug: 'froid-conservation', label: 'Froid & conservation', examples: 'Chambres froides, armoires, vitrines réfrigérées' },
      { slug: 'boulangerie-patisserie', label: 'Boulangerie-pâtisserie', examples: 'Fours à sole, pétrins, façonneuses, chambres de pousse' },
      { slug: 'bar-boissons', label: 'Bar & boissons', examples: 'Machines à café, tireuses, machines à glaçons' },
      { slug: 'laverie-blanchisserie', label: 'Laverie & blanchisserie', examples: 'Lave-linge et séchoirs professionnels' },
    ],
  },
  {
    slug: 'industrie', label: 'Industrie & machines', types: [
      { slug: 'usinage', label: 'Usinage & machines-outils', examples: "Centres d'usinage, tours, fraiseuses, découpe laser" },
      { slug: 'robotique', label: 'Robotique & automatisation', examples: 'Robots, cobots, lignes automatisées' },
      { slug: 'fabrication-additive', label: 'Fabrication additive', examples: 'Imprimantes 3D industrielles' },
      { slug: 'transformation-conditionnement', label: 'Transformation & conditionnement', examples: 'Presses, conditionneuses, étiqueteuses' },
      { slug: 'energie-air', label: 'Énergie & air comprimé', examples: 'Compresseurs, groupes électrogènes' },
      { slug: 'outillage', label: 'Outillage & matériel', examples: 'Outillage électroportatif, établis, mesure' },
    ],
  },
  {
    slug: 'manutention', label: 'Manutention & logistique', types: [
      { slug: 'manutention', label: 'Manutention', examples: 'Chariots élévateurs, transpalettes, gerbeurs' },
      { slug: 'elevation-acces', label: 'Élévation & accès', examples: 'Nacelles, échafaudages, monte-charges' },
      { slug: 'entrepot-stockage', label: 'Entrepôt & stockage', examples: 'Rayonnages, racks, mezzanines' },
      { slug: 'preparation-commandes', label: 'Préparation de commandes', examples: 'Convoyeurs, terminaux, scanners' },
    ],
  },
  {
    slug: 'btp', label: 'BTP & chantier', types: [
      { slug: 'engins-chantier', label: 'Engins de chantier (non immatriculés)', examples: 'Mini-pelles, chargeuses, compacteurs' },
      { slug: 'mesure-securite-chantier', label: 'Mesure & sécurité chantier', examples: 'Stations totales, lasers, détection' },
    ],
  },
  {
    slug: 'securite', label: 'Sécurité & surveillance', types: [
      { slug: 'videosurveillance', label: 'Vidéosurveillance', examples: 'Caméras, enregistreurs, supervision' },
      { slug: 'alarme-acces', label: "Alarme & contrôle d'accès", examples: 'Centrales d’alarme, badges, interphonie' },
    ],
  },
  {
    slug: 'sport', label: 'Sport & bien-être', types: [
      { slug: 'cardio-musculation', label: 'Cardio & musculation', examples: 'Tapis, vélos, machines guidées' },
      { slug: 'recuperation-bien-etre', label: 'Récupération & bien-être', examples: 'Cryothérapie, balnéo, massage' },
    ],
  },
  {
    slug: 'vehicules', label: 'Véhicules', types: [
      { slug: 'vehicules-immatricules', label: 'Véhicules immatriculés', examples: 'VL, VU, poids lourds, remorques' },
    ],
  },
]

const FAMILY_BY_SLUG = new Map(EQUIPMENT_FAMILIES.map(f => [f.slug, f]))
const TYPE_INDEX = new Map(EQUIPMENT_FAMILIES.flatMap(f => f.types.map(t => [t.slug, { family: f, type: t }] as const)))

export function familyOf(slug: string | null | undefined): EquipmentFamily | null {
  return slug ? FAMILY_BY_SLUG.get(slug) ?? null : null
}

export function typeOf(slug: string | null | undefined): { family: EquipmentFamily; type: EquipmentType } | null {
  return slug ? TYPE_INDEX.get(slug) ?? null : null
}

export function isFamily(slug: unknown): slug is string {
  return typeof slug === 'string' && FAMILY_BY_SLUG.has(slug)
}

export function isType(slug: unknown): slug is string {
  return typeof slug === 'string' && TYPE_INDEX.has(slug)
}

/**
 * Les 8 catégories de l'ancienne analyse IA et des lignes déjà enregistrées → famille.
 * « Autre » n'a pas de famille : le matching ne filtre alors pas sur le matériel.
 */
export const LEGACY_CATEGORY_FAMILY: Record<string, string | null> = {
  Informatique: 'informatique',
  Téléphonie: 'telephonie',
  Audiovisuel: 'audiovisuel',
  Mobilier: 'mobilier',
  Médical: 'medical',
  Industrie: 'industrie',
  Véhicule: 'vehicules',
  Autre: null,
}

export const FINANCING_TYPES = [
  { slug: 'leasing', label: 'Location financière / leasing' },
  { slug: 'lease_back', label: 'Lease-back' },
  { slug: 'credit_bail', label: 'Crédit-bail' },
] as const

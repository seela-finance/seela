// Contenu de la home partagé entre le rendu (LandingPage) et les données
// structurées (JSON-LD FAQ). Règles de vérité : aucun délai de financement
// promis, seul engagement : rappel sous 24 h ouvrées.
import type { Faq } from './solutions'

export const HOME_FAQ: Faq[] = [
  {
    q: 'Dois-je changer de fournisseur ?',
    a: 'Non. Vous gardez votre fournisseur, votre matériel et votre devis. Le financeur règle le fournisseur, vous payez un loyer.',
  },
  {
    q: 'Quelles pièces faut-il fournir ?',
    a: "Un devis ou une facture pour commencer. Kbis, dernier bilan et pièce d'identité sont demandés ensuite, une seule fois.",
  },
  {
    q: 'En combien de temps ai-je une réponse ?',
    a: 'Notre équipe vous rappelle sous 24 h ouvrées. La réponse dépend ensuite de chaque financeur, nous ne promettons pas de délai à sa place.',
  },
]

// Secteurs « à la une » de la home : photo, pictogramme et page secteur.
export const HOME_SECTORS = [
  { slug: 'chr-hotellerie-restauration', lines: ['Hôtellerie et', 'restauration'], icon: 'resto', img: '/landing/secteur-chr.jpg', alt: 'Un chef fait sauter une poêle dans sa cuisine', pos: '30% 30%' },
  { slug: 'sante-cabinets-medicaux', lines: ['Santé et', 'bien-être'], icon: 'medical', img: '/landing/secteur-sante.jpg', alt: 'Une coach guide une cliente sur une machine de Pilates', pos: '55% 50%' },
  { slug: 'securite-surveillance', lines: ['Sécurité et', 'télésurveillance'], icon: 'shield', img: '/landing/secteur-securite.jpg', alt: "Une caméra de surveillance fixée à l'angle d'un immeuble", pos: '62% 40%' },
  { slug: 'industrie-production', lines: ['Industrie et', 'artisanat'], icon: 'factory', img: '/landing/secteur-industrie.jpg', alt: 'Un artisan à genoux sur son chantier, outils à portée de main', pos: '60% 22%' },
] as const

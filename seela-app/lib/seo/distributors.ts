// Contenu de la page /distributeurs partagé entre le rendu (DistributorsView)
// et les données structurées (JSON-LD FAQ). Règles de vérité : aucun délai de
// financement promis, financeurs anonymes, le branchement aux outils est
// présenté comme un service à la demande, jamais comme une intégration livrée.
import type { Faq } from './solutions'

export const DISTRIBUTORS_PATH = '/distributeurs'

export const DISTRIBUTORS_META = {
  title: 'Distributeurs et fournisseurs : le financement de vos ventes',
  description:
    "Vos commerciaux transmettent le devis, everlease monte le dossier de financement et le présente aux financeurs adaptés. Moins d'administratif, moins de refus, un dispositif à votre mesure.",
}

export const DISTRIBUTORS_FAQ: Faq[] = [
  {
    q: 'Combien cela coûte-t-il à mon entreprise ?',
    a: "Rien. Il n'y a ni frais d'entrée, ni abonnement, ni volume minimum. Everlease est rémunérée lorsque le dossier aboutit.",
  },
  {
    q: 'Nous travaillons déjà avec un loueur. Faut-il le quitter ?',
    a: "Non. Everlease s'ajoute à votre circuit, sans exclusivité. Vous pouvez commencer par les dossiers que votre loueur refuse ou ne traite pas.",
  },
  {
    q: 'Quels dossiers prenez-vous ?',
    a: 'Des équipements professionnels, de 2 500 à 350 000 € HT, sur 24 à 60 mois. Nous vous indiquons le périmètre par type de matériel dès le premier échange.',
  },
  {
    q: 'Quand suis-je réglé ?',
    a: 'À la livraison, par le financeur, une fois le matériel réceptionné par votre client.',
  },
  {
    q: 'Pouvez-vous vous connecter à notre CRM ?',
    a: "Nous l'étudions avec votre équipe, selon vos outils. En attendant, un devis transmis par email suffit pour ouvrir un dossier.",
  },
]

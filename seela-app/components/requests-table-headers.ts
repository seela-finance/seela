// En-têtes partagés par le dashboard et la page Contrats (même ordre que les cellules de RequestsTable).
// Hors de RequestsTable.tsx : une constante exportée d'un module 'use client' devient une
// référence client côté serveur (pas un tableau), et `.map` y plante.
export const REQUESTS_TABLE_HEADERS = ['Référence', 'Actif financé', 'Leaser', 'Mensualité', 'Créé le', 'Statut']

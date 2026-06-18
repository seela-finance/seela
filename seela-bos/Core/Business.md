# Business

## Vision (long terme)
Monter un **product studio spécialisé "location / gestion de la location"** pour les pros : plusieurs solutions combinant offres de service et SaaS dans le domaine de la loc. Seela est la première brique, pas la finalité.

## Produit n°1 — Seela
Plateforme de **financement locatif** pour les professionnels (leasing, LLD, lease-back).
Parcours : une entreprise upload un devis/facture → analyse IA du document → configuration du financement → réception d'offres indicatives de leasers partenaires.

- **Phase produit** : déjà construit et fonctionnel, plus avancé qu'une simple maquette. App Next.js réelle avec : analyse de bilan, scoring, matching leasers, intégration Pappers, validation d'offres, parcours upload→analyse→config→offres→confirmation.
- **Modèle opérationnel actuel** : Wizard of Oz — traitement leasers manuel par l'équipe Seela, offres indicatives confirmées sous 48h.
- **Leasers cités dans le produit** : BNP Lease, Société Générale Équipement, Crédit Agricole Leasing.
- **Stack** : Next.js 14 (App Router, TS), Supabase (DB/Auth/Storage), Claude API (analyse docs vision), Tailwind, Vercel.

## Persona (à préciser)
Cible = professionnels / entreprises qui financent de l'équipement. À affiner : quel type d'entreprise, quel ticket, quel canal d'acquisition.

## Backlog d'idées produits (studio location) — NON priorisé, à earn après le 1er wedge prouvé
Services productisables :
- Contentieux (recouvrement / gestion des litiges loc)
- Procurement / achat externalisé — "remplacer le service achat des entreprises"
- Support IT
- Intégrer la loc dans les entreprises qui achètent (faire basculer l'achat vers la loc)

Logiciels / agents IA :
- Logiciel métier + agents IA pour les loueurs (outiller les loueurs eux-mêmes)

SaaS :
- Gestion de catalogue
- ERP de la location

> Note BOS : ces idées vont du plus rapide-à-monétiser (services manuels) au plus lourd (ERP). Service-first puis SaaS = séquence classique et saine pour un studio. À NE PAS lancer tant que le 1er wedge n'a pas de revenue.

## Go-to-market actuel
Modèle = **apport d'affaires aux leasers**. Seela qualifie/agrège des dossiers de financement côté entreprises et les apporte aux leasers partenaires, qui instruisent et financent. Étape go-to-market immédiate : **signer des partenariats apporteur d'affaires avec des leasers**.
- Ce qu'un leaser achète : du **deal flow qualifié** (baisse son coût d'instruction) + de la **confiance** (atout : exit Cleaq, maison déjà connue du milieu).
- Levier de vente le plus fort : 2-3 **vrais dossiers qualifiés** posés sur la table > UI léchée.

## Finances
À documenter — pas encore de revenue connu. Modèle de revenue = commission sur dossiers apportés/financés via les leasers partenaires (% à clarifier).

## À clarifier (ouvert)
- Modèle de revenue exact de Seela.
- Le wedge : Seela est-il le meilleur premier produit du studio, ou juste le premier imaginé ?
- Les autres idées de produits "location" déjà en tête.

## Statut
Phase **Find / positionnement** : valider le wedge product et le positionnement avant de diversifier.

# Business

Mise à jour : 2026-11-16

## Vision
Un **roll-up IA de la location financière** en France, démarré organiquement avec everlease. everlease génère et place des dossiers de financement aujourd'hui ; demain, le rachat d'un loueur indépendant lui donne un flux de contrats, des conventions leasers et une équipe, et la tech d'everlease sert de socle pour optimiser chaque société rachetée.

Le product studio « location » imaginé en juin 2026 est remplacé par cette thèse. Ses idées (contentieux, agents IA pour loueurs, gestion de parc, ERP de la loc) deviennent des leviers d'optimisation des sociétés rachetées, pas des produits à lancer séparément.

## Thèse
- **Positionnement** : loueur **agnostique** (tout actif professionnel, pas de vertical IT) et **partenaire financier** des distributeurs et opérateurs. Jamais distributeur ni opérateur de service soi-même.
- **Modèle en deux temps** : d'abord céder les contrats aux leasers (peu de capital), puis devenir originateur et en porter une partie au bilan. L'origination bute sur le monopole bancaire pour le crédit-bail, la LOA et le lease-back avec option d'achat ; la location financière pure n'en relève pas.
- **Où est la valeur** : gestion des contrats et de leur fin de vie, relation leasers, montage et placement des dossiers, tech.
- **Si une acquisition apporte un opérateur** : garder les contrats et les clients, confier l'opérationnel à un tiers.

## Brique n°1 — everlease (ex-Seela)
**Le parcours** : une entreprise dépose un devis ou une facture, l'IA lit le document et l'éligibilité, everlease prépare le dossier et le présente aux financeurs adaptés, puis accompagne jusqu'à la signature. Produits : location financière, crédit-bail, LLD, LOA, lease-back.

**Le produit (au 16/11/2026)**
- App Next.js en prod sur everlease.fr (Vercel de Louis depuis le 03/11), Supabase prod et staging séparés.
- Back-office `/admin` livré fin octobre : liste et fiche des dossiers, validation, transmission au leaser, réponse du leaser, fiche société.
- Offres fiabilisées (matching sur l'ancienneté réelle, conditions sans invention), sécurité renforcée (RLS, documents privés).
- Agent de dev autonome : backlog d'issues, CI et tests Playwright, merge prod soumis à l'accord de Louis.
- Fonctionnement encore **manuel côté financeurs** (Wizard of Oz) : Louis transmet les dossiers.

**La marque** : design system v2 depuis le 04/11/2026 (jauge comme forme signature, « une grosse dépense devient un flux régulier »). **Règles de vérité** : aucun nom, logo ni nombre de financeurs affiché sans accord, aucun délai de financement promis, exemples marqués « illustratif ».

**Le trafic** : une landing et des pages SEO (solutions × secteurs) qui ont apporté **plus d'une dizaine de leads** de qualité variable depuis l'été. Premier lead inbound le 27/08/2026 (JY'NOVE, lease-back sur un centre d'usinage).

## Les trois publics
1. **Clients directs** : dirigeants et DAF de TPE et PME qui financent un équipement (CHR, santé, BTP, commerce, industrie, transport, fitness, sécurité, audiovisuel, boulangerie). Canal actuel : SEO.
2. **Distributeurs et fournisseurs d'équipement** : apporteurs de dossiers, à qui everlease propose du financement pour leurs clients. Recherche en cours.
3. **Financeurs** : banques, leasers et loueurs indépendants qui instruisent et financent. Ce qu'ils achètent : des dossiers propres qui baissent leur coût d'instruction, et la confiance (exit Cleaq).

## Financeurs partenaires
- **Grenke** (call avec Florent le 09/11/2026, aussi actionnaire de Cleaq) : finance tout sauf les véhicules immatriculés, pas de crédit-bail. Paiement direct au fournisseur à réception, acompte de 30 % maximum, fournisseurs FR/UE en euros. Commission bridée à **2 %** en apport pur. Barème indicatif 24 à 60 mois et convention d'apporteur attendus (barème de travail : `Output/everlease-bareme-grenke.xlsx`).
- Aucun autre financeur signé.

## Modèle de revenu
- Commission des financeurs (2 % chez Grenke en apport pur).
- Piste : frais fixes payés par le client (idée : 1 000 € jusqu'à 50 k€, puis 2,5 %, puis 3,8 %). Non validé.

## Finances
Aucun revenu encaissé connu au 16/11/2026. Louis a aussi des missions rémunérées (environ 2,5 jours par semaine jusqu'à fin 2026, à confirmer).

## Cibles de rachat
- **Registre leaser** : `/Users/Louis/Constay/leasing/registre/` (1 255 sociétés, 78 cibles), page https://claude.ai/artifact/96KhSzfJxpd2AaMGN8qj4r.
- **30 cibles qualifiées** le 04/11/2026 : 7 confirmées (Viatelease, Infibail, Leasy, Efilease, Fiparc, KNS Lease, Liard Finance), 10 à creuser (dont Prefiloc, M2M Financement, Mile), 13 écartées.
- **Consolidateurs déjà actifs** : Realease (fonds Qualium), Fidlease (fonds Albarest, a racheté CF Bail), Infibail rapproché de Mile le 24/12/2025.
- **Profil de la première plateforme** : loueur cédant de 5 à 25 M€ de CA, avec un réseau de distributeurs et un dirigeant ouvert à une transition (Fiparc, Leasy, KNS Lease en premier).
- **Porte d'entrée** : Xavier de Castet (Infibail, président du Cercle des Loueurs Indépendants).

## Financement du rachat
Deal par deal : apport de Louis, family offices ou entrepreneurs du secteur, dette bancaire, crédit vendeur. Pas de VC avant le premier rachat. Ordre de grandeur à valider : pour 0,7 M€ d'EBE à 4-5x, un prix de 3 à 3,5 M€ et environ 1 M€ de fonds propres.

## Équipe
- **Louis** : fondateur, seul depuis le 23/10/2026.
- **Aurélien** : partenaire tech freelance, rémunéré au résultat, pas associé.

## Outils
Next.js 14, Supabase, Claude API, Vercel, Resend, Pappers ; Granola pour les calls ; Lemlist prévu pour l'outbound (le compte connecté est celui d'un client de Cleaq, ne pas l'utiliser pour everlease).

## Ouvert
- Clause de non-concurrence de la cession Cleaq.
- Statut ORIAS / IOBSP pour l'apport d'affaires (zone grise selon Grenke, à valider par un avocat).
- Clauses de changement de contrôle dans les conventions leasers.
- Modèle de revenu final (commission seule ou frais client).

## Statut
- **everlease** : phase PMF. Du trafic et des leads, pas encore de dossier financé ni de revenu.
- **Rachat** : phase Find. Thèse et cibles posées, rien n'est encore engagé.

# Parcours distributeur

Décidé avec Louis le 17/11/2026, à partir du retour de Gonzague (BoucheCousue, infogérance) : les distributeurs ne proposent pas la location parce que c'est trop d'administratif, que les plateformes des leasers sont pénibles, et qu'ils n'ont aucune visibilité sur les dossiers.

## Le parcours

1. **Activation (équipe everlease).** Sur la fiche société du CRM, carte « Partenaire distributeur », bouton « Activer comme partenaire ». La société passe en `lifecycle_stage = 'partenaire'`, avec `partner_enabled = true`. Ce bouton est réservé au droit `decide_requests`.
2. **Dossier monté par le partenaire.** Son compte voit « Mes clients » dans la barre latérale. Dans « Nouveau financement », il passe par les mêmes étapes que le client : dépôt, analyse IA, lignes, durée. À l'étape 4, il saisit le **SIREN** et l'**email** de son client.
3. **À l'envoi** (`POST /api/requests/[id]/submit`, mode partenaire) :
   - le dossier est soumis comme celui d'un client ;
   - il est rattaché à la société du client, retrouvée par SIREN ou créée depuis le registre public. Ce rattachement a lieu **avant** le matching, qui lit l'ancienneté de la société ;
   - le partenaire est enregistré sur le dossier (`partner_company_id`, `partner_contact_id`) ;
   - une invitation est créée (30 jours, seul le hash du jeton est stocké), puis le matching tourne et l'email part au client avec le meilleur loyer indicatif.
4. **Le client rejoint le dossier** (`/invitation/[token]`). Il crée son espace ou se connecte **avec l'email invité**, puis clique « Accéder à mon dossier » :
   - il devient propriétaire du dossier (`user_id`), et `client_joined_at` est daté ;
   - son compte est rattaché à la société du dossier, seulement si aucun autre compte n'y travaille (même règle que l'onboarding).
5. **Le client choisit son offre** dans le circuit habituel. Tant qu'il n'a pas rejoint le dossier, le partenaire ne peut pas confirmer à sa place (`confirmOffer` renvoie 403).
6. **Suivi par le partenaire** (`/app/partenaire`). Pour chaque dossier apporté par sa société : client, montant, loyer (indicatif ou choisi), durée, statut, et **date de fin du contrat**. Il peut renvoyer le lien, ce qui annule l'ancien. Le financeur reste anonyme et la commission n'est pas affichée.
7. **Démarrage du contrat (équipe).** Sur la fiche dossier admin, « Démarrer le contrat » fait passer le dossier de `leaser_confirmed` à `active` avec `contract_start_date`. La date de fin vaut début + durée.

## Données (`20261118090000_partner_distributors.sql`)

- `companies.partner_enabled` : lisible par le compte pour sa seule société.
- `financing_requests` :
  - `partner_company_id` et `partner_contact_id`, **sans clé étrangère** : une seconde relation rendrait ambiguës les jointures `companies(...)` et `contacts(...)` existantes ;
  - `client_joined_at` ;
  - `contract_start_date`.
- Le navigateur ne peut écrire aucun de ces champs (politique restrictive `requests_insert_no_partner`).
- `request_invitations` (hash du jeton, email, expiration, acceptation, annulation) : serveur uniquement.

La migration suppose celles du CRM (`companies`, `contacts`) déjà appliquées.

## Hors périmètre pour l'instant

- Commission du partenaire.
- Intégration Sellsy, CRM ou ERP, et MCP.
- Plusieurs interlocuteurs côté client.
- Relance automatique d'un client qui n'a pas ouvert son lien.

# Modèle de données — Société, Contact et CRM

Statut : **proposition à valider par Louis** · Option C retenue par Louis et Lorenzo le 16/11/2026 · Logique **HubSpot** (objets, vocabulaire, écrans).

## En bref

| Objet (HubSpot) | Table | Rôle |
|---|---|---|
| **Société** | `companies` | Objet central : prospects, clients, partenaires. Tout s'y rattache |
| **Contact** | `contacts` | Toute personne liée à une société. Un contact peut avoir un accès à l'app (il remplace `profiles`) |
| **Deal** | `crm_deals` | Opportunité commerciale, suivie dans un pipeline |
| **Dossier** | `financing_requests` | Demande de financement, rattachée à la société **et** au contact qui l'a créée |
| **Activité** | `crm_activities` | Appel, email, note, réunion |
| **Tâche** | `crm_tasks` | Action à faire, avec échéance |

- Les identifiants de connexion (email, mot de passe, sessions) restent dans **Supabase Auth** (`auth.users`), géré et sécurisé par Supabase. Le contact pointe vers son accès (`contacts.user_id`), comme un contact HubSpot pointe vers son accès au portail client.
- La table `profiles` disparaît : ses colonnes « personne » vont dans `contacts`, ses colonnes « société » dans `companies`.
- 2 migrations : une pour créer et recopier, une pour supprimer `profiles`.

```
                         ┌──────────────────────┐
                         │ companies (Société)  │  ◀── objet central
                         └──────────┬───────────┘
          company_id ┌──────────────┼───────────────┬────────────────┐
                     │              │               │                │
            ┌────────▼──────┐ ┌─────▼──────────┐ ┌──▼──────────┐ ┌───▼─────────────┐
 auth.users │ contacts      │ │ financing_     │ │ crm_deals   │ │ crm_activities  │
  ◀─user_id─│ (personnes)   │◀│ requests       │ │             │ │ crm_tasks       │
            └───────────────┘ │ created_by ─▶  │◀│ request_id  │ │ crm_mentions    │
                              │ contact        │ └─────────────┘ └─────────────────┘
                              └────────────────┘
```

---

## 1. `companies` — Société

| Colonne | Type | Origine | Note |
|---|---|---|---|
| `id` | uuid PK | — | Identifiant |
| `siren` | text, unique si non nul | `profiles.siren` | Identité légale. Nul permis pour un prospect, obligatoire pour déposer un dossier |
| `domain` | text, indexé (non unique) | nouveau | Domaine du site et des emails, clé de l'outbound. Non unique : un groupe partage un domaine entre filiales |
| `name` | text NOT NULL | `profiles.company_name` | |
| `legal_form` | text | `profiles.legal_form` / `forme_juridique` | Les 2 colonnes actuelles fusionnées |
| `naf_code` | text | `profiles.naf_code` | |
| `creation_year` | integer | `profiles.date_creation` | |
| `address` | text | `profiles.supplier_address` | Adresse du siège |
| `country` | text default 'FR' | `profiles.country` | |
| `revenue_bracket`, `age_bracket`, `headcount_bracket` | text | `profiles` | KYC léger |
| `revenue_declared`, `result_declared` | numeric | `profiles` | |
| `kyc_completed`, `financial_docs_uploaded`, `onboarding_completed` | boolean | `profiles` | |
| `seela_score`, `seela_score_grade`, `seela_score_details` | integer / text / jsonb | `profiles` | Écrits côté serveur uniquement (#23) |
| `lifecycle_stage` | text default 'prospect' | nouveau | `prospect` · `client` · `partenaire` · `exclu`. Mis à jour **à la main** |
| `sector`, `asset_types` (text[]), `source`, `signal`, `website` | text | nouveau | Qualification commerciale |
| `owner_id` | uuid → `admins.user_id` | nouveau | Propriétaire de la société (commercial) |
| `created_at`, `updated_at` | timestamptz | — | |

Les données externes (Pappers, registre) restent dans `company_data (siren, source, payload, fetched_at)` prévue par #32 / #43, jointe par SIREN.

## 2. `contacts` — Contact

| Colonne | Type | Origine | Note |
|---|---|---|---|
| `id` | uuid PK | — | |
| `company_id` | uuid → companies | `profiles` (via la société créée) | Société principale du contact |
| `user_id` | uuid unique → auth.users, nul permis | `profiles.id` | Rempli si le contact a un accès à l'app |
| `first_name`, `last_name`, `phone` | text | `profiles` | |
| `email` | text | `profiles.email` | Email de contact. L'email de connexion fait foi dans `auth.users` |
| `job_title` | text | `profiles.role` | Poste |
| `persona` | text | nouveau | `DAF` · `Dirigeant` · `Ops / Achats` · `Revendeur` · `Autre` |
| `linkedin_url`, `lemlist_url` | text | nouveau | |
| `owner_id` | uuid → admins | nouveau | |
| `created_at`, `updated_at` | timestamptz | — | |

Un contact sans `user_id` = une personne connue du CRM qui ne s'est pas inscrite (prospect, interlocuteur secondaire).

## 3. `financing_requests` — Dossier

**Ajoute** :
- `company_id uuid NOT NULL → companies` : la société du dossier (objet central)
- `created_by uuid → contacts` : la personne qui l'a créé

**Garde** `user_id` pendant la bascule, supprimé en migration 2 (remplacé par `created_by`).

Fournisseurs (`supplier_name`, `supplier_siren`, extraits du devis par l'IA) : restent du texte en V1. Les relier à `companies` est un chantier ultérieur.

## 4. CRM

### `crm_deals` — Deal
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `company_id` | uuid NOT NULL → companies | |
| `contact_id` | uuid → contacts | Contact principal |
| `request_id` | uuid unique → financing_requests, nul permis | Le dossier issu du deal |
| `name` | text NOT NULL | |
| `stage` | text NOT NULL | `a_contacter` · `en_conversation` · `rdv_pris` · `proposition` · `a_recontacter` · `signe` · `perdu` |
| `amount` | numeric | Montant estimé |
| `next_action`, `next_action_date` | text / date | |
| `close_date` | date | |
| `summary` | text | Synthèse du deal |
| `angle` | text | Trésorerie, Lease-back, Comparaison d'offres… |
| `source_list`, `signal_type`, `lemlist_campaign` | text | |
| `lost_reason` | text | Pas de besoin · Timing · Concurrent · Silence · Autre |
| `owner_id` | uuid → admins | |
| `created_at`, `updated_at` | timestamptz | |

### `crm_activities` — Activité
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `type` | text NOT NULL | `call` · `email` · `note` · `meeting` |
| `call_outcome` | text | `pas_de_reponse` · `messagerie` · `pas_interesse` · `a_rappeler` · `interesse` · `rdv_pris` |
| `title`, `summary`, `body` | text | `body` = note complète ou transcript |
| `occurred_at` | timestamptz NOT NULL | |
| `author_id` | uuid → auth.users | Membre de l'équipe |
| `company_id`, `contact_id`, `deal_id`, `request_id` | uuid, nuls permis | Associations. Au moins une remplie |
| `created_at` | timestamptz | |

### `crm_mentions`
`activity_id` → crm_activities, `user_id` → auth.users (membre de l'équipe), `seen_at` timestamptz. Clé : (`activity_id`, `user_id`).

### `crm_tasks` — Tâche
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `title` | text NOT NULL | |
| `due_date` | date | |
| `priority` | text | `haute` · `normale` · `basse` |
| `done_at` | timestamptz | Nul = à faire |
| `assignee_id` | uuid → admins | |
| `company_id`, `contact_id`, `deal_id`, `request_id` | uuid, nuls permis | Associations |
| `created_at` | timestamptz | |

## 5. Qui voit quoi

| Table | Client connecté | Équipe (admin, commercial) |
|---|---|---|
| `companies` | Lit **sa** société | Tout, via le serveur |
| `contacts` | Lit son contact et ceux de sa société | Tout, via le serveur |
| `financing_requests` (+ `line_items`, `offers`) | Les dossiers de **sa société** (`company_id` = société de son contact) | Tout, via le serveur |
| `crm_*` | Rien (RLS activée, aucune policy, comme `admin_events`) | Tout, via le serveur |

- Le client n'écrit plus directement sur sa société ni sur son contact depuis le navigateur : **inscription et onboarding passent par des Server Actions** (nécessaire pour retrouver une société par SIREN parmi toutes les sociétés, et pour protéger score et SIREN).
- Nouveau droit `crm` dans `lib/admin-roles.ts`, donné à `admin` et `commercial`. Les leasers restent invisibles pour `commercial`.

## 6. Identification et doublons

L'identifiant d'une société est son `id`. SIREN et domaine servent à **la retrouver** :

1. SIREN connu → société existante.
2. Sinon, domaine connu (hors messageries grand public : gmail, orange, outlook, free…) → proposition « société déjà connue ? », jamais de fusion automatique.
3. Sinon → nouvelle société.

S'applique à l'inscription (domaine de l'email), à la création manuelle dans le CRM et à l'import d'une liste outbound. Le SIREN d'un prospect peut être complété plus tard par l'enrichissement (#43). Même logique pour les contacts : rapprochement par email.

## 7. Automatismes

| Quand | Ce qui se passe |
|---|---|
| Inscription | Création ou rattachement de la société (§6), création ou rattachement du contact par email, avec `user_id` rempli |
| Dossier créé | `company_id` = société du contact, `created_by` = le contact |
| Dossier créé depuis un deal | `crm_deals.request_id` rempli |
| Fiche Société, Contact, Deal ou Dossier | Une seule chronologie : `admin_events` + `crm_activities` (vue SQL `company_timeline`) |

## 8. Écrans (logique HubSpot)

- **Fiche** en 3 colonnes : à gauche les propriétés, au centre la chronologie et les onglets (activités, notes, tâches), à droite les **associations** (contacts, deals, dossiers).
- **Listes** (sociétés, contacts, deals) avec filtres et vues enregistrées.
- **Pipeline** des deals en colonnes par étape, avec glisser-déposer.
- Design system v2 d'everlease (`ev-*`), pas les couleurs HubSpot.

## 9. Migrations

| # | Contenu |
|---|---|
| M1 | Crée `companies`, `contacts`, les tables `crm_*`. Ajoute `financing_requests.company_id` et `created_by`. Recopie `profiles` vers `companies` + `contacts` (staging : comptes de test). Nouvelles règles d'accès |
| M2 | Supprime `profiles` et `financing_requests.user_id`, une fois tout le code basculé (≈ 20 fichiers lisent aujourd'hui `profiles`) |

Le CRM démarre vide : pas de reprise du cockpit Notion (données de test).

## 10. Points ouverts

1. **Contact rattaché à plusieurs sociétés** (HubSpot le permet) : V1 = une société principale par contact. Suffisant ?
2. **Fournisseurs** comme sociétés : reporté (§3).

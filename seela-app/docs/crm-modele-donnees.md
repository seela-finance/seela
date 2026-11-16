# Modèle de données — société unique et CRM

Statut : **proposition à valider par Louis** · Décision d'origine : option C, retenue par Louis et Lorenzo le 16/11/2026.

## En bref

- Une table `companies` = **toutes les sociétés qu'everlease connaît** : prospects, clients, partenaires, fournisseurs.
- `profiles` ne garde que **la personne** (le compte de connexion) et pointe vers sa société.
- Le CRM (contacts, deals, activités, tâches) est rattaché à `companies`.
- Les dossiers restent rattachés au compte (`financing_requests.user_id`) : **les règles d'accès client ne changent pas** en V1.
- 2 migrations en tout : une pour créer, une pour nettoyer.

```
                 ┌────────────────┐
  auth.users ──▶ │ profiles       │ ── company_id ──▶ ┌──────────────┐
                 │ (la personne)  │                   │ companies    │
                 └───────┬────────┘                   │ (la société) │
                         │ user_id                    └──────┬───────┘
                 ┌───────▼────────────┐                      │
                 │ financing_requests │◀── request_id ──┐    │ company_id
                 └────────────────────┘                 │    │
                                         ┌──────────────┴────▼──────────────┐
                                         │ crm_contacts · crm_deals         │
                                         │ crm_activities · crm_tasks       │
                                         │ crm_mentions                     │
                                         └──────────────────────────────────┘
```

---

## 1. `companies` — la société

| Colonne | Type | Origine | Note |
|---|---|---|---|
| `id` | uuid PK | — | |
| `siren` | text, unique si non nul | `profiles.siren` | Identité légale. Nul permis pour un prospect ; obligatoire pour devenir client |
| `domain` | text, indexé (non unique) | nouveau | Domaine du site / des emails, clé de l'outbound. Non unique : un groupe partage un domaine entre filiales |
| `name` | text NOT NULL | `profiles.company_name` | |
| `legal_form` | text | `profiles.legal_form` / `forme_juridique` | Les 2 colonnes actuelles fusionnées |
| `naf_code` | text | `profiles.naf_code` | |
| `creation_year` | integer | `profiles.date_creation` | Renommée : c'est une année |
| `address` | text | `profiles.supplier_address` | Renommée : c'est l'adresse du siège |
| `country` | text default 'FR' | `profiles.country` | |
| `revenue_bracket`, `age_bracket`, `headcount_bracket` | text | `profiles` | KYC léger |
| `revenue_declared`, `result_declared` | numeric | `profiles` | |
| `kyc_completed`, `financial_docs_uploaded` | boolean | `profiles` | |
| `seela_score`, `seela_score_grade`, `seela_score_details` | integer / text / jsonb | `profiles` | Écrits côté serveur uniquement (#23) |
| `crm_status` | text | nouveau | `prospect` · `client` · `partenaire` · `fournisseur` · `exclu` |
| `sector` | text | nouveau | Liste du cockpit (IT, Médical, BTP…) |
| `asset_types` | text[] | nouveau | |
| `source` | text | nouveau | Inbound, liste lemlist, partenaire… |
| `signal` | text | nouveau | |
| `website` | text | nouveau | |
| `owner_id` | uuid → `admins.user_id` | nouveau | Commercial responsable |
| `created_at`, `updated_at` | timestamptz | — | |

Les données externes (Pappers, registre) restent dans `company_data (siren, source, payload, fetched_at)` prévue par #32 / #43, jointe par SIREN.

## 2. `profiles` — la personne

**Garde** : `id`, `first_name`, `last_name`, `email`, `phone`, `role` (poste), `onboarding_completed`, `created_at`.
**Ajoute** : `company_id uuid REFERENCES companies(id)`.
**Retire** (migration 2, une fois le code basculé) : toutes les colonnes listées en origine au §1.

## 3. CRM

### `crm_contacts`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `company_id` | uuid NOT NULL → companies | |
| `profile_id` | uuid unique → profiles, nul permis | Rempli si la personne a un compte |
| `first_name`, `last_name`, `job_title`, `email`, `phone` | text | Si `profile_id` est rempli, l'affichage prend les valeurs du compte |
| `persona` | text | `DAF` · `Dirigeant` · `Ops / Achats` · `Revendeur` · `Autre` |
| `linkedin_url`, `lemlist_url` | text | |
| `owner_id` | uuid → admins | |
| `created_at`, `updated_at` | timestamptz | |

### `crm_deals`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `company_id` | uuid NOT NULL → companies | |
| `contact_id` | uuid → crm_contacts | Contact principal |
| `request_id` | uuid unique → financing_requests, nul permis | Le dossier issu du deal |
| `name` | text NOT NULL | |
| `stage` | text NOT NULL | `a_contacter` · `en_conversation` · `rdv_pris` · `proposition` · `a_recontacter` · `signe` · `perdu` |
| `estimated_amount` | numeric | |
| `next_action`, `next_action_date` | text / date | |
| `close_date` | date | |
| `summary` | text | Synthèse du deal |
| `angle` | text | Trésorerie, Lease-back, Comparaison d'offres… |
| `source_list`, `signal_type`, `lemlist_campaign` | text | |
| `lost_reason` | text | Pas de besoin · Timing · Concurrent · Silence · Autre |
| `owner_id` | uuid → admins | |
| `created_at`, `updated_at` | timestamptz | |

### `crm_activities`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `type` | text NOT NULL | `call` · `email` · `note` · `meeting` |
| `call_outcome` | text | `pas_de_reponse` · `messagerie` · `pas_interesse` · `a_rappeler` · `interesse` · `rdv_pris` |
| `title` | text | |
| `summary` | text | Résumé court |
| `body` | text | Note complète ou transcript |
| `occurred_at` | timestamptz NOT NULL | |
| `author_id` | uuid → auth.users | |
| `company_id`, `contact_id`, `deal_id` | uuid, nuls permis | Au moins un des trois rempli |
| `created_at` | timestamptz | |

### `crm_mentions`
`activity_id` → crm_activities, `user_id` → auth.users, `seen_at` timestamptz. Clé : (`activity_id`, `user_id`).

### `crm_tasks`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `title` | text NOT NULL | |
| `due_date` | date | |
| `priority` | text | `haute` · `normale` · `basse` |
| `done_at` | timestamptz | Nul = à faire |
| `source` | text | Manuel, appel, Claude… |
| `assignee_id` | uuid → admins | |
| `company_id`, `contact_id`, `deal_id` | uuid, nuls permis | |
| `created_at` | timestamptz | |

## 4. Qui voit quoi

| Table | Client connecté | Équipe (admin, commercial) |
|---|---|---|
| `companies` | Lit **sa** société (via `profiles.company_id`). N'écrit pas directement : passe par une Server Action | Tout, via le serveur |
| `crm_*` | Rien (RLS activée, aucune policy, comme `admin_events`) | Tout, via le serveur |

Nouveau droit `crm` dans `lib/admin-roles.ts`, donné à `admin` et `commercial`. Les leasers restent invisibles pour `commercial`.

## 5. Automatismes

| Quand | Ce qui se passe |
|---|---|
| Inscription avec un SIREN déjà connu (prospect) | Le compte est rattaché à la société existante. Rien n'est créé en double |
| Inscription avec un SIREN inconnu | Création de la société, `crm_status = prospect` |
| Toute inscription | Création d'un `crm_contacts` relié au compte (`profile_id`) |
| Dossier créé depuis un deal | `crm_deals.request_id` rempli |
| Fiche société, deal ou dossier | Une seule chronologie : `admin_events` + `crm_activities` (vue SQL `company_timeline`) |

## 6. Migrations

| # | Contenu | Quand |
|---|---|---|
| M1 | Crée `companies` et les tables `crm_*`, ajoute `profiles.company_id`, recopie les comptes existants (staging : comptes de test) | Phase 1 |
| M2 | Retire les colonnes société de `profiles` | Après la bascule du code (≈ 20 fichiers lisent aujourd'hui `company_name` / `siren`) |

## 7. Identification et doublons

L'identifiant d'une société est son `id` interne. SIREN et domaine servent à **la retrouver** :

1. SIREN connu → société existante avec ce SIREN.
2. Sinon, domaine connu (hors messageries grand public : gmail, orange, outlook, free…) → proposition de rattachement « société déjà connue ? », jamais de fusion automatique.
3. Sinon → nouvelle société.

S'applique à l'inscription (domaine de l'email du compte), à la création manuelle dans le CRM et à l'import d'une liste outbound. Le SIREN d'un prospect peut être complété plus tard par l'enrichissement (#43).

Pas de reprise du cockpit Notion : il ne contenait que des données de test. Le CRM démarre vide.

## 8. Points à trancher## 8. Points à trancher

1. **Écritures du client sur sa société** : aujourd'hui l'onboarding écrit `profiles` depuis le navigateur. Proposition : ces écritures passent par une Server Action (protège le score et le SIREN). Plus de travail en phase 1, mais plus sûr.
2. **Passage en `client`** : automatique quand un contrat devient actif, ou manuel ?
3. **Fournisseurs** : relier dès maintenant `financing_requests.supplier_siren` à `companies`, ou plus tard ?
4. **Dossiers rattachés à la société** (`financing_requests.company_id`) : reporté tant qu'il n'y a qu'un utilisateur par société. D'accord ?

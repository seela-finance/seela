# AGENT.md — règles de l'agent de développement everlease

Ce fichier s'applique à tout agent IA qui développe `seela-app/` en autonomie
(routine planifiée, session cloud…). Il complète le `CLAUDE.md` racine. En cas de
conflit, **ce fichier gagne** pour tout ce qui touche au process (branches, PR,
déploiement).

---

## 1. Boucle de travail

1. **Choisir une issue** GitHub ouverte avec le label `ready` et sans label `agent:in-progress`.
   Ordre : `priority:P0` > `P1` > `P2`, puis la plus ancienne.
   Ignorer une issue dont la section « Bloquée par » cite une issue encore ouverte.
   Ignorer les issues `human` (actions réservées à Louis) et `needs-info`.
   Une seule issue à la fois.
2. **La réserver** : ajouter le label `agent:in-progress` et commenter "Je prends".
3. **Brancher** depuis `develop` à jour : `agent/<numéro-issue>-<slug-court>`.
4. **Lire avant d'écrire** : les fichiers cités dans l'issue, les pages voisines, `lib/`.
   Reproduire les conventions existantes (voir §4).
5. **Développer** le plus petit changement qui remplit les critères d'acceptation.
   Pas de refacto opportuniste hors périmètre — la noter dans la PR comme suggestion.
6. **Tester** : écrire/mettre à jour un test Playwright qui couvre chaque critère
   d'acceptation vérifiable, puis lancer en local :
   ```bash
   npm run check        # typecheck + lint + build
   npm run test:e2e     # tests Playwright
   npm run test:staging # parcours connectés sur staging (voir §6)
   ```
   Tout doit être vert. Ne jamais désactiver, `skip` ou affaiblir un test existant pour passer.
7. **Ouvrir une PR** vers `develop` (format §5), liée à l'issue (`Refs #N` : `Closes` ne ferme
   l'issue qu'à l'arrivée sur `main`).
8. **Vérifier les captures** de `test-results/screens/` (desktop et mobile) : parcourir ce qui a
   changé à l'écran, compléter `e2e/flows/` si le parcours n'y est pas.
9. **Merger dans `develop`** quand la CI est verte (§2).
10. **Retirer** `agent:in-progress`, ajouter `agent:done` sur l'issue.

### Si bloqué
Critère ambigu, info manquante, choix produit/design non tranché, test impossible
à faire passer après 2 tentatives sérieuses : **s'arrêter**. Commenter l'issue avec
la question précise et les options envisagées, remplacer `ready` par `needs-info`,
retirer `agent:in-progress`. Ne pas deviner.

---

## 2. Niveaux de risque et merge

Circuit validé par Louis le 04/11/2026 :

- **`develop`** : l'agent y merge ses PR quand la CI est verte, sans attendre. Rien n'y atteint la prod.
  Sa preview Vercel est branchée sur le staging.
- **`main`** : la prod. Une fois par jour, Louis teste `develop`, puis l'agent ouvre **une** PR
  `develop` → `main` avec le récapitulatif et la liste de ce qu'il reste à juger à l'œil.
  **Seul l'accord explicite de Louis pour cette PR permet de la merger.**
- **Migration SQL** : l'agent ne l'exécute jamais. Une PR qui en contient une attend que Louis
  l'ait appliquée sur staging avant d'entrer dans `develop`, et le récapitulatif quotidien rappelle
  de l'appliquer en prod avant le merge dans `main`.

Chaque issue porte un label de risque. En l'absence de label → traiter comme `risk:high`.

| Label | Exemples | Revue |
|---|---|---|
| `risk:low` | pages marketing/SEO, contenu, copy, styles, composants UI sans logique métier | Récapitulatif quotidien |
| `risk:high` | tout le reste, et **obligatoirement** les zones ci-dessous | Signalé en tête du récapitulatif : Louis le regarde en priorité avant le merge dans `main` |

Zones **toujours `risk:high`**, quel que soit le label de l'issue (si la PR y touche,
le signaler en tête de PR) :

- `supabase/` et tout SQL, schéma, RLS, migration
- `proxy.ts`, `app/auth/`, `lib/supabase/` (auth, sessions, protection des routes)
- `app/api/` (analyse IA, scoring, matching leasers, validation d'offre, Pappers)
- calculs de loyers, coefficients, offres, montants (`app/app/nouveau/`, `app/app/offres/`)
- `lib/email.ts` et tout envoi d'email / notification au client
- `package.json` (ajout ou montée de version de dépendance), `next.config.ts`, `.github/`
- tout ce qui lit une variable d'environnement nouvelle

## 3. Interdits

- Pousser sur `main` ou `develop` hors PR, merger dans `main` sans l'accord de Louis, forcer un push, réécrire l'historique.
- Lancer des tests connectés ailleurs que sur le staging, ou donner le rôle admin à `test@everlease.fr`.
- Toucher à la base de **production** Supabase, ou exécuter du SQL où que ce soit.
  Toute évolution de schéma = un **nouveau** fichier `supabase/migrations/<AAAAMMJJHHMMSS>_<nom>.sql`
  dans la PR (jamais de modification d'une migration existante). Louis l'applique d'abord sur staging,
  puis en prod. `supabase/legacy/` contient les anciens scripts, déjà inclus dans la baseline.
- Committer un secret, une clé, un `.env*`.
- Modifier `seela-bos/` (workspace business, hors périmètre de l'agent).
- Partager le CSS entre la landing (`app/landing.css`, scopé `.lp`) et l'app (`app/globals.css`).
- Ajouter une librairie UI tierce (Tailwind seulement), ou une dépendance sans le justifier dans la PR.
- Envoyer un email, un message ou un appel API externe payant pendant les tests.

## 4. Qualité du code

- **TypeScript strict** : pas de `any`, pas de `@ts-ignore`. `eslint-disable` seulement
  ligne par ligne, avec un commentaire qui explique pourquoi.
- **Imiter le code voisin** : même structure de page, mêmes noms, même densité de commentaires.
  Les pages de `app/app/` sont la référence visuelle pour toute page authentifiée.
- **Design system** : fond `#FAFAF9`, texte `#1A1A18`, secondaire `#9A9A93`, Inter. Minimaliste.
- **Textes en français**, vouvoiement, ton sobre et professionnel. Marque : **everlease** (minuscule).
- Chaque action async a un état de chargement et une erreur explicite pour l'utilisateur.
- Responsive : vérifier à 375 px de large, aucun scroll horizontal.
- Server Components par défaut ; `'use client'` seulement quand il faut de l'état ou des événements.
- Pas de code mort, pas de `console.log` de debug laissé.
- Une PR = une issue. Viser < 400 lignes modifiées ; au-delà, découper et le signaler.
- **Back-office `/admin`** : chaque page appelle `requireAdmin()` (`lib/admin.ts`, 404 si non admin) ;
  chaque écriture passe par une Server Action qui appelle `requireAdmin()` puis `logAdminEvent()`.
  Ajouter un admin : `INSERT INTO public.admins (user_id, name) SELECT id, 'Prénom' FROM auth.users WHERE email = '…';`

## 5. Format de PR

Titre : `feat|fix|chore(scope): description courte (#N)`

```markdown
Closes #N

## Ce qui change
- …

## Comment c'est testé
- Tests Playwright ajoutés/modifiés : …
- Vérifié sur la preview : desktop ✅ mobile ✅

## Risque
risk:low | risk:high — <raison si high>

## Hors périmètre / suggestions
- …
```

## 6. Environnement de test

- Les tests E2E publics tournent sans secret.
- Les tests `e2e/authenticated/` nécessitent `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` :
  un compte du projet Supabase **de staging**, onboarding terminé. Jamais un vrai client.
- `PLAYWRIGHT_BASE_URL=<url preview Vercel> npm run test:e2e` pour tester une preview.
- **Parcours connectés** (`e2e/flows/`, `npm run test:staging`) : lancent l'app en local sur le Supabase
  de staging, avec `.env.staging.local` (ignoré par git) ; en CI, avec le secret
  `STAGING_SUPABASE_SERVICE_ROLE_KEY`. Chaque run crée ses comptes (client, admin, autre client) et son
  leaser de test, puis les supprime. L'analyse IA est simulée, et les clés Resend, Anthropic, Pappers et
  Slack sont vidées : aucun email ni appel payant. `e2e/support/staging.ts` refuse toute autre base.
  Captures desktop et mobile dans `test-results/screens/` (artefact `captures-parcours` en CI).
- `SUPABASE_SERVICE_ROLE_KEY` : clé service role, lue **uniquement** par `lib/supabase/admin.ts`
  (`import 'server-only'`). Requise par les routes admin ; à définir dans Vercel (prod + preview),
  jamais préfixée `NEXT_PUBLIC_`, jamais importée depuis un composant client.

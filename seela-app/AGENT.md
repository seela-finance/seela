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
3. **Brancher** depuis `main` à jour : `agent/<numéro-issue>-<slug-court>`.
4. **Lire avant d'écrire** : les fichiers cités dans l'issue, les pages voisines, `lib/`.
   Reproduire les conventions existantes (voir §4).
5. **Développer** le plus petit changement qui remplit les critères d'acceptation.
   Pas de refacto opportuniste hors périmètre — la noter dans la PR comme suggestion.
6. **Tester** : écrire/mettre à jour un test Playwright qui couvre chaque critère
   d'acceptation vérifiable, puis lancer en local :
   ```bash
   npm run check        # typecheck + lint + build
   npm run test:e2e     # tests Playwright
   ```
   Tout doit être vert. Ne jamais désactiver, `skip` ou affaiblir un test existant pour passer.
7. **Ouvrir une PR** vers `main` (format §5), liée à l'issue (`Closes #N`).
8. **Vérifier la preview Vercel** de la PR : parcourir la fonctionnalité, joindre
   1 à 3 captures (desktop + mobile si UI) en commentaire de PR.
9. **Retirer** `agent:in-progress`, ajouter `agent:done` sur l'issue.

### Si bloqué
Critère ambigu, info manquante, choix produit/design non tranché, test impossible
à faire passer après 2 tentatives sérieuses : **s'arrêter**. Commenter l'issue avec
la question précise et les options envisagées, remplacer `ready` par `needs-info`,
retirer `agent:in-progress`. Ne pas deviner.

---

## 2. Niveaux de risque et merge

Chaque issue porte un label de risque. En l'absence de label → traiter comme `risk:high`.

| Label | Exemples | Merge |
|---|---|---|
| `risk:low` | pages marketing/SEO, contenu, copy, styles, composants UI sans logique métier | **Auto-merge** autorisé quand la CI est verte |
| `risk:high` | tout le reste, et **obligatoirement** les zones ci-dessous | **PR seulement** — Louis valide et merge |

Zones **toujours `risk:high`**, quel que soit le label de l'issue (si la PR y touche,
ne pas auto-merger et le signaler en tête de PR) :

- `supabase/` et tout SQL, schéma, RLS, migration
- `proxy.ts`, `app/auth/`, `lib/supabase/` (auth, sessions, protection des routes)
- `app/api/` (analyse IA, scoring, matching leasers, validation d'offre, Pappers)
- calculs de loyers, coefficients, offres, montants (`app/app/nouveau/`, `app/app/offres/`)
- `lib/email.ts` et tout envoi d'email / notification au client
- `package.json` (ajout ou montée de version de dépendance), `next.config.ts`, `.github/`
- tout ce qui lit une variable d'environnement nouvelle

## 3. Interdits

- Pousser sur `main`, forcer un push, réécrire l'historique.
- Toucher à la base de **production** Supabase, ou exécuter du SQL où que ce soit.
  Une migration se livre comme fichier `supabase/<nom>.sql` dans la PR, appliquée à la main par Louis.
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
- `SUPABASE_SERVICE_ROLE_KEY` : clé service role, lue **uniquement** par `lib/supabase/admin.ts`
  (`import 'server-only'`). Requise par les routes admin ; à définir dans Vercel (prod + preview),
  jamais préfixée `NEXT_PUBLIC_`, jamais importée depuis un composant client.

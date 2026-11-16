---
name: everlease-dev
description: Démarre ou reprend une session de développement sur l'app everlease (dossier seela-app) - vérifie l'environnement (Node, dépendances, secrets, branches), charge les règles du projet (circuit develop, migrations SQL, design system v2, règles de vérité, anonymat des financeurs, rôles du back-office) et cadre le travail jusqu'à la PR. À utiliser au début de chaque session de code sur everlease, ou quand on dit « on code sur everlease », « démarre une session », « setup dev », « je reprends le CRM ».
---

# Session de développement everlease

Tu travailles sur **everlease** (ancien nom : Seela), plateforme de financement locatif pour les professionnels. Le code vit dans `seela-app/` (Next.js App Router, Supabase, Tailwind). `seela-bos/` est un workspace business : **n'y touche jamais**.

Plusieurs personnes codent sur ce dépôt, chacune avec Claude : Louis (fondateur, seul à valider la prod) et Lorenzo. Les règles ci-dessous évitent qu'on se marche dessus et protègent la prod.

## 1. Au démarrage : vérifier l'environnement

Lance ces vérifications, puis résume en quelques lignes ce qui est prêt et ce qui manque. N'affiche jamais la valeur d'un secret.

1. **Dépôt** : `git rev-parse --show-toplevel` doit contenir `seela-app/`. `git status` propre ? Sinon, demande quoi faire des changements en cours avant tout.
2. **Comptes** : `git config user.name`, `gh auth status` (accès à `seela-finance/seela`).
3. **Node** : `node -v` doit correspondre à `seela-app/.nvmrc` (Node 24). Sinon, propose `nvm use`.
4. **Dépendances** : dans `seela-app/`, `npm ci` si `node_modules` manque ou si `package-lock.json` a changé. Si npm échoue sur `~/.npm` (EACCES), relance avec `--cache <dossier temporaire>`.
5. **Secrets** (fichiers ignorés par git) :
   - `seela-app/.env.local` : pour `npm run dev` (valeurs du **staging**, jamais de la prod).
   - `seela-app/.env.staging.local` : pour `npm run test:staging`.
   Vérifie seulement qu'ils existent (`test -f`). S'ils manquent : Louis les transmet par un gestionnaire de mots de passe. **Ne jamais les demander ni les coller dans le chat, ni les committer.**
6. **État du travail** :
   - `git fetch origin` puis `git log --oneline -5 origin/develop` ;
   - `gh pr list --repo seela-finance/seela --state open` : les PR ouvertes de chacun ;
   - `gh issue list --repo seela-finance/seela --label ready` : ce qui est prêt à prendre.
7. **Lire** `CLAUDE.md` (racine) et `seela-app/AGENT.md`. Ils font foi ; ce skill les résume.

Termine par : ce qui est prêt, ce qui manque, les PR ouvertes qui touchent la zone visée, puis demande sur quoi on travaille.

## 2. Règles non négociables

**Circuit**
- Une branche par sujet, partie de `develop` à jour : `lorenzo/<sujet-court>` (ou `agent/<n°-issue>-<sujet>` pour une issue).
- PR vers `develop` uniquement. Merge dans `develop` seulement quand la CI est verte.
- **Jamais de push ni de merge sur `main`**. `main` est la prod : seul Louis la valide, par une PR `develop` → `main`.
- Pas de force push, pas de réécriture d'historique sur une branche partagée.

**Base de données**
- Ne jamais toucher la base de **production**. Le seul SQL autorisé passe par le connecteur `supabase-staging` (`.mcp.json`, limité au projet staging `fmbvvzmoepsyjlhrmbpy`) : vérifier que le projet visé est bien celui-là avant toute écriture.
- Toute évolution de schéma = un **nouveau** fichier `seela-app/supabase/migrations/<AAAAMMJJHHMMSS>_<nom>.sql`, rejouable (`IF NOT EXISTS`, blocs `DO $$ … duplicate_object`). Ne jamais modifier une migration existante.
- Sur le staging, la session l'applique elle-même via `supabase-staging` (outil `apply_migration`, nom = nom du fichier), une fois testée en local et avec l'accord de l'humain présent. En prod, c'est Louis. Une PR avec migration attend son application sur le staging avant d'entrer dans `develop`.
- Le code doit fonctionner **avant comme après** la migration, sinon le dire dans la PR avec l'ordre exact (exemple : `requireAdmin` lit `admins.*` pour survivre à l'ajout de la colonne `role`).
- Tester la migration en local avant la PR, par exemple avec PGlite sur une copie des tables concernées, y compris avec des données qui ressemblent à la prod.

**Données et confidentialité**
- **Anonymat des financeurs** : côté client (pages, HTML, emails, API), jamais le nom d'un leaser. On affiche `offers.public_name` (« Financeur A · Banque ») ; les requêtes client listent leurs colonnes avec `CLIENT_OFFER_COLUMNS` (`lib/offers.ts`). Les tables des leasers ne sont lisibles que par le serveur (service role).
- Aucun secret dans le code, le chat ou une PR. La clé service role n'est lue que par `lib/supabase/admin.ts`.
- Tests connectés **sur le staging uniquement** (`npm run test:staging`). Aucun email ni appel API payant pendant les tests.

**Back-office `/admin`**
- Rôles (`lib/admin-roles.ts`) : `admin` (tous les droits) et `commercial` (consulte, ajoute des notes).
- Chaque page appelle `requireAdmin()` ou `requireCapability(...)` (`lib/admin.ts`, 404 sinon).
- Chaque écriture passe par une Server Action qui **vérifie le droit côté serveur** (`can(admin.role, capability)`), puis journalise avec `logAdminEvent()`. Masquer un bouton ne suffit pas.
- Un nouveau module (CRM, etc.) ajoute sa capacité dans `lib/admin-roles.ts` et son entrée dans `components/admin/AdminNav.tsx`.

**Interface et contenu**
- **Design system v2 obligatoire** (voir `CLAUDE.md`) : tokens et classes `ev-*` de `app/globals.css` (`ev-card`, `ev-btn`, `ev-input`, `ev-tag`, `ev-kicker`, `ev-mono`…), cobalt réservé à l'action, aucune ombre sauf la modale, listes en rangées à filets. Séparateurs : `divide-y divide-[var(--line)]` (sans la couleur, ils sortent noirs).
- Ne jamais partager le CSS entre la landing (`app/landing.css`, `.lp`) et l'app.
- **Règles de vérité** : chaque chiffre client est un « Exemple illustratif », « hors assurance et services », suivi de « Sous réserve d'acceptation du dossier par le financeur. » Aucun délai de financement promis (seul engagement : rappel sous 24 h ouvrées).
- Textes en français, vouvoiement, marque « everlease » en minuscules. Responsive vérifié à 375 px.

## 3. Boucle de travail

1. **Cadrer** : reformuler le besoin, lire les fichiers concernés et le code voisin, proposer un plan court (fichiers, migration éventuelle, tests). Attendre l'accord pour un sujet structurant (modèle de données, droits, montants).
2. **Brancher** depuis `develop` à jour.
3. **Coder** en imitant le code voisin. La logique métier va dans des fonctions pures de `lib/`, testables, avec la base injectée (voir `lib/admin-workflow.ts` et `lib/admin-store.ts`).
4. **Tester** :
   - tests unitaires dans `seela-app/e2e/unit/` pour la logique pure ;
   - un parcours dans `seela-app/e2e/flows/parcours.spec.ts` pour chaque comportement visible. Les comptes éphémères (client, admin, intruder, member) et le leaser de test viennent de `e2e/staging.seed.ts` ; l'IA est simulée par `e2e/support/fake-anthropic.mjs`. Les parcours tournent en parallèle sur ces mêmes comptes : ne modifie pas une donnée qu'un autre parcours utilise.
   - dans `seela-app/` : `npm run check`, `npm run test:e2e`, puis `npm run test:staging`. Tout doit être vert ; ne jamais affaiblir ni `skip` un test pour passer.
5. **Relire les captures** de `test-results/screens/` (desktop et mobile).
6. **PR** vers `develop`, au format de `AGENT.md` §5 : ce qui change, comment c'est testé (résultats réels), ce qui n'est pas couvert, le risque (`risk:high` pour SQL, auth, `app/api`, montants, emails, droits).
7. **Merge** dans `develop` quand la CI est verte, puis prévenir Louis de ce qui attend sa validation pour la prod.

## 4. Pièges connus

- `npm run check` échoue au prerender de `/auth` sans variables Supabase publiques : charger `.env.staging.local` (variables publiques seulement) avant le build local.
- Turbopack : un `.next/dev` corrompu bloque le serveur de test → `rm -rf .next/dev`. Avant `tsc`, `rm -rf .next/types .next/dev/types`.
- Le serveur de dev peut dépasser 2 min au démarrage (polices Google, `next/font`) : relancer une fois avant de chercher plus loin.
- PostgREST renvoie les `numeric` en texte : convertir avec `Number()` avant de comparer ou calculer.
- Un sous-composant déclaré dans le rendu d'un autre perd le focus à chaque frappe : utiliser une fonction de rendu.
- Le message d'un `useActionState` disparaît si le composant est démonté après l'action : le placer hors du bloc qui disparaît.
- Une commande `… | head` masque le code de sortie : ne pas enchaîner un commit derrière.

## 5. Le CRM dans le back-office

Louis veut un **cockpit complet dans `/admin`** plutôt qu'un CRM séparé (un artefact Claude avait été commencé). Avant de coder le CRM :
- proposer le modèle de données (tables, lien avec `profiles` et `financing_requests`, ce qui est visible par quel rôle) et la reprise des données déjà saisies dans l'artefact ;
- travailler dans une zone à soi (`app/admin/crm/`, `lib/crm-*.ts`, `components/admin/crm/`) et signaler toute modification des fichiers partagés (`AdminNav`, `lib/admin*.ts`, `parcours.spec.ts`, migrations), pour éviter les conflits avec les autres sessions.

# Blog & SEO everlease — roadmap de contenu

Document de pilotage de la session SEO (18/11/2026). Couvre : (1) les visuels manquants, (2) la cartographie éditoriale du blog à valider, (3) le workflow de publication (gate de relecture humaine).

---

## 1. Visuels manquants (tu me donnes les images, je les intègre)

Le composant `ImageSlot` affiche un placeholder tant que le fichier n'est pas déposé — dès que tu fournis l'image au bon nom, elle s'affiche **sans toucher au code**.

### Secteurs — 12 photos à fournir (4 secteurs sur 10)
Déposer dans `public/secteurs/` au format `jpg`, paysage, ~1600px de large. Noms exacts attendus :

| Secteur | Fichiers (hero / équipement / ambiance) |
|---|---|
| Boulangerie-pâtisserie | `boulangerie-patisserie-hero.jpg` · `-equipement.jpg` · `-ambiance.jpg` |
| Salles de sport & fitness | `salles-de-sport-fitness-hero.jpg` · `-equipement.jpg` · `-ambiance.jpg` |
| Sécurité & surveillance | `securite-surveillance-hero.jpg` · `-equipement.jpg` · `-ambiance.jpg` |
| Audiovisuel & production | `audiovisuel-production-hero.jpg` · `-equipement.jpg` · `-ambiance.jpg` |

> Les 6 autres secteurs (CHR, santé, BTP, commerce, industrie, transport) ont déjà leurs 3 photos.
> Le descriptif de chaque visuel (cadrage attendu) est dans le champ `hint` de `lib/seo/sectors.ts`.

### Pages Solutions — à décider
Les 5 pages Solutions n'ont **aucun visuel** (le composant `SolutionView` n'en prévoit pas). Deux options :
- **A** — on ajoute un visuel hero par solution (il faut 5 images + une petite modif du composant). Plus vivant, mais les solutions sont des pages « concept » (moins évidentes à illustrer sans tomber dans la banque d'images générique).
- **B** — on garde les solutions sans photo (plus sobre, cohérent avec le design system « pas de photo décorative »). *Recommandé par défaut.*

### Blog — visuel d'article (optionnel, plus tard)
Les articles n'ont pas d'image d'en-tête aujourd'hui (volontairement : le design system v2 évite l'illustration figurative). Si on en veut une par article, c'est un ajout `ImageSlot` dans `ArticleView` + une image par article.

---

## 2. Cartographie éditoriale — à valider avant rédaction en masse

3 piliers, ~15 articles. Le **1er article est déjà rédigé et publié** (gabarit). Pour le reste : tu valides / réordonnes / coupes, puis je rédige.

**Convention de maillage** : chaque article lie en contextuel vers 2-4 pages Solutions/Secteurs (dans le corps) + un bloc « À lire aussi » vers 1-2 articles du même pilier.

### Pilier 1 — Comprendre & comparer (`comprendre-comparer`)
Intention décision/comparaison, fort intent, lie vers les pages Solutions.

| # | Titre / requête cible | Statut | Liens internes |
|---|---|---|---|
| 1 | **Crédit-bail ou LLD : différences et comment choisir** | ✅ **publié** | credit-bail, lld, location-financiere · industrie, transport |
| 2 | Leasing ou crédit professionnel : que choisir ? | 🟡 brouillon créé | location-financiere, credit-bail |
| 3 | Crédit-bail : définition, fonctionnement, avantages | ⚪ à écrire | credit-bail |
| 4 | LOA ou LLD pour un professionnel : laquelle choisir ? | ⚪ à écrire | loa, lld |
| 5 | Lease-back : transformer son matériel en trésorerie | ⚪ à écrire | leaseback · industrie |

### Pilier 2 — Financer un type d'équipement (`financer-par-equipement`)
Souvent plus de volume que les requêtes secteur. Lie vers Solutions + Secteurs.

| # | Titre / requête cible | Statut | Liens internes |
|---|---|---|---|
| 6 | Comment financer du matériel informatique | ⚪ à écrire | location-financiere · commerce |
| 7 | Financer une machine-outil / un équipement industriel | ⚪ à écrire | credit-bail · industrie |
| 8 | Financer une flotte de véhicules utilitaires en LLD | ⚪ à écrire | lld · transport |
| 9 | Financer du matériel médical (cabinet, imagerie) | ⚪ à écrire | credit-bail · sante |
| 10 | Financer l'équipement d'un restaurant / cuisine pro | ⚪ à écrire | credit-bail, lld · chr |

### Pilier 3 — Guides pratiques & décision (`pratique-decision`)
TOFU/MOFU, capte le pro en action. Lie partout.

| # | Titre / requête cible | Statut | Liens internes |
|---|---|---|---|
| 11 | Quelle durée choisir pour un leasing professionnel ? | ⚪ à écrire | toutes solutions |
| 12 | Leasing et comptabilité : traitement, TVA, déductibilité | ⚪ à écrire | credit-bail, location-financiere |
| 13 | Peut-on financer du matériel d'occasion / reconditionné ? | ⚪ à écrire | credit-bail, location-financiere |
| 14 | Financer son équipement sans apport : est-ce possible ? | ⚪ à écrire | location-financiere |
| 15 | Les étapes d'une demande de financement locatif | ⚪ à écrire | hub solutions + /auth |

> **Priorisation suggérée pour la 1re vague** (après validation) : #3, #6, #11, #14 — gros intent, faciles à sourcer, couvrent les 3 piliers.

---

## 3. Workflow de publication — gate de relecture humaine

**Rien de rédigé par IA n'atteint le site public sans ton feu vert.** Le mécanisme est dans `lib/seo/blog.ts` :

- Chaque article a un champ `published: boolean`.
- `published: false` (brouillon) = **jamais** rendu, listé sur le hub, prérendu, ni au sitemap. (vérifié au build : seul l'article publié est généré.)
- Pour publier un article relu : passer `published: true` → il apparaît sur `/blog`, dans le sitemap, et devient une page SSG.

**Boucle cible** (1-2 articles / semaine) :
1. Je rédige un article en brouillon (`published: false`) depuis la liste ci-dessus.
2. Tu le relis (fond, ton, règles de vérité : exemples illustratifs, « sous réserve d'acceptation », financeurs anonymes).
3. On passe `published: true` et on met en prod.

Branche GSC (Search Console) à connecter pour piloter les requêtes réelles et réordonner cette liste.

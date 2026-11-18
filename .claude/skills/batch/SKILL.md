---
name: batch
description: Routine hebdomadaire outbound everlease - 1) débrief des batches arrivés à J+21 et verdict proposé sur les segments en test, 2) choix des batches de la semaine dans le portefeuille Notion, 3) préparation et création des campagnes Lemlist (sourcing, choix des 120 leads, angle, variables personnalisées, relecture, brouillon). L'IA prépare, Lorenzo décide. À utiliser quand on dit « /batch », « routine outbound », « on lance les batches de la semaine », « débrief et nouveaux batches ».
---

# Routine hebdomadaire outbound

**L'IA prépare, Lorenzo décide.** Une séance par semaine, dans cet ordre : on écoute ce qui est revenu, on choisit, on prépare.

Repères fixes :
- **1 batch = 1 segment = 1 campagne Lemlist = 120 leads maximum.** Le plafond garde un même « pourquoi maintenant » et une personnalisation tenable ; plusieurs batches tournent en parallèle.
- **2 batches par semaine** (limite : 200 appels par semaine), 3 quand les 8 boîtes Lemlist sont prêtes.
- Segment = type d'entreprise × persona. Le pilotage des segments vit dans Notion (voir « Notion » en bas).

## Ouverture
1. Lire la page Notion « Outbound · Portefeuille de segments » (règles, rythme), la base **Segments** et les dernières entrées du **Journal des décisions**.
2. Lister les campagnes Lemlist (`get_campaigns`) et repérer : les batches **à J+21 ou plus pas encore débriefés** (aucune entrée « Verdict segment » ou « Batches de la semaine » qui les mentionne), les batches en cours.
3. Annoncer le programme de la séance en 3 lignes, puis demander l'export CRM : ouvrir `/admin/crm/batches/export` dans le CRM (connecté) et déposer le fichier JSON. **Claude n'accède jamais à la base de prod** : l'export est la seule source CRM (appels, deals, réponses). S'il n'est pas fourni, le dire et continuer avec Lemlist seul.

---

## Partie 1 · Débrief (≈ 10 min par batch à J+21)
Sur ~120 leads on a quelques réponses : **on écoute, on ne prouve rien.**

Pour chaque batch à J+21 :
1. **Alertes** (chiffres bruts, pas de % sous 10 personnes) : rebonds > 5 %, désinscriptions, réponses agacées, « pas le bon interlocuteur » répété, zéro réponse. Sinon « Aucune alerte ». Source : `get_campaigns_stats`.
2. **Ce qu'on a entendu** : toutes les réponses (`get_inbox_conversations` filtré sur la campagne, puis `get_inbox_conversation`) et les notes d'appel de l'export, en citations brutes, sans nom de personne, avec le type : intérêt, timing, déjà financé, pas le bon interlocuteur, méfiance, autre.
3. **Conversations qualifiées** = réponses intéressées + appels « intéressé » ou « RDV pris ».
4. **2 ou 3 pistes de l'IA**, formulées comme des impressions à vérifier.
5. « Qu'est-ce que tu en retiens ? » → noter la réponse telle quelle.
6. **Si c'est un batch de test** : appliquer les règles de la page Notion et **proposer** le verdict du segment (Validé, 2e test en changeant une seule chose, Abandonné) avec la raison. Lorenzo valide ou corrige.
7. Écrire (après validation) : la ligne du segment dans Notion (`Statut`, compteurs, `Batches`, `Ce qu'on a appris` sur le segment ou la persona, `Verdict`, `Dernière décision`) et une entrée « Verdict segment » dans le Journal des décisions (`Ce qu'on a entendu`, `Pourquoi`, `Décidé par`).

Ici : rien sur la performance du copywriting, pas de comparaison entre batches. C'est le rôle de `/revue`.

---

## Partie 2 · Choix des batches de la semaine
Proposer les 2 (ou 3) batches selon l'ordre de priorité de la page Notion :
1. un segment en **2e test** en attente ;
2. un segment **validé** sans batch depuis 2 semaines (découpé en micro-segment — zone, taille, signal — s'il en a déjà eu) ;
3. la **meilleure idée** (note /15 la plus haute) ;
avec **au plus 2 segments en test en même temps**. Tant qu'aucun segment n'est validé : 1 test + 1 nouveau.

Pour chaque batch proposé, une fiche courte :
| Champ | Contenu |
|---|---|
| Segment | Type d'entreprise (secteur, sous-secteur, taille, zone) × persona |
| Statut | Validé / 2e test / nouveau |
| Pourquoi maintenant | Le signal visé |
| Source | Voir `references/sources.md` |
| Ce qui change | Pour un 2e test : la seule chose modifiée |
| Exclusions | Clients, deals ouverts, déjà contactés, sociétés rattachées à un groupe qui finance lui-même si pertinent |

→ « Je valide ces batches ou tu ajustes ? » Écrire une entrée « Batches de la semaine » dans le Journal. Un nouveau segment est ajouté dans la base Segments avec le statut « En test ».

---

## Partie 3 · Préparer chaque batch
Un batch après l'autre.

**3.1 Sourcing (~300 candidats)** depuis la source de la fiche :
- Lemlist : `load_skill("lead-search")` puis `lemleads_search` ;
- Sales Navigator (claudnav) : `sn_search_companies`, `sn_search_people`, `sn_search_from_url` ;
- recherche web pour les signaux ;
- Pharow, Google Maps, fichiers publics : donner à Lorenzo les filtres exacts et le format du CSV attendu (société, domaine, SIREN, ville, nom, poste, email, LinkedIn).

**3.2 Enrichissement et notation** : compléter email et LinkedIn ; annoncer volume et coût en crédits avant tout enrichissement payant en masse. Noter chaque société de 1 à 3 en **adéquation** et en **signal** ; un signal sans source (URL, date) ne compte pas.

**3.3 Lorenzo choisit les 120** dans un tableau trié (150 lignes max) : société, ville, contact, poste, adéquation, signal, signal en une ligne avec sa source. Sélection par défaut = les 120 premiers. Jamais plus de 120.

**3.4 Dédoublonnage** : retirer les leads déjà dans une campagne (`search_campaign_leads` avec `include: ["campaigns"]`) et les sociétés de l'export CRM (clients, deals ouverts, disqualifiées récemment). Sous 100 leads, proposer des remplaçants.

**3.5 Trois angles → Lorenzo en choisit 1.** Chacun : problème (avec les mots du persona), bénéfice, preuve, CTA en texte entier. Trois angles vraiment différents. Pour un segment validé, partir de l'angle qui a marché.

**3.6 Variables Lemlist** (noms exacts, lus par la synchro du CRM) :
- identiques pour tout le batch : `segment`, `persona`, `source`, `angle`, `hypothese` ;
- propres à chaque lead : `icebreaker` (une phrase entière, **uniquement** sur un signal vérifiable, sinon vide → fallback du template), `positionnement` (2 phrases max), `cta` (phrase entière).

Règles d'écriture : vouvoiement ; « everlease » en minuscules ; **aucun délai de financement promis** ; **jamais le nom d'un financeur** ; aucun chiffre inventé ; phrases courtes, pas de superlatifs.

**3.7 Relecture** : signaler les textes génériques, faux ou non sourcés, bancals, non conformes. Montrer à Lorenzo **seulement les signalés + 15 au hasard** ; il valide, corrige ou retire.

**3.8 Campagne en brouillon** :
1. Numéro : plus grand `B<nn>` dans `get_campaigns`, + 1 (les « EVL | … » ne comptent pas).
2. Nom : `B<nn> · <segment> · <persona>`.
3. Créer la campagne (dupliquer la séquence de référence si elle existe), séquence avec `{{icebreaker}}`, `{{positionnement}}`, `{{cta}}` et un fallback si `icebreaker` est vide.
4. Importer les leads avec toutes leurs variables.
5. `validate_campaign_readiness`, puis `preview_email` sur 3 leads dont un sans icebreaker.
6. **Laisser en brouillon** et demander « Je lance ? ». On ne lance qu'après un **oui explicite**.

Ensuite : mettre à jour `Batches` sur la ligne du segment dans Notion. Le CRM rattache seul le batch aux sociétés à la synchro suivante (toutes les heures).

---

## Notion
Page « Outbound · Portefeuille de segments » dans l'espace d'équipe, avec deux bases :
- **Segments** — `collection://41c9d437-fb14-8107-a12b-000beee209bb` : une ligne par type d'entreprise × persona (statut, type d'entreprise, persona, pourquoi maintenant, source, taille adressable, note /15, batches, leads contactés, conversations qualifiées, deals qualifiés, CA gagné, ce qu'on a appris, verdict, dernière décision).
- **Journal des décisions** — `collection://41c9d437-fb14-8186-92da-000b537618f8` : décision, date, type, segments liés, pourquoi, ce qu'on a entendu, décidé par.

Règles :
- On n'y met **que** les segments et les personas, jamais la performance du copywriting.
- Un changement de `Statut` ou de `Verdict`, et toute entrée du Journal, ne s'écrit **qu'après validation explicite** de Lorenzo ou Louis.
- Les règles de statut et le rythme sont sur la page parente : les relire, ne pas les réinventer.

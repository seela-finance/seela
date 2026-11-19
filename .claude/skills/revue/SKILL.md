---
name: revue
description: Revue mensuelle du portefeuille de segments outbound everlease (environ 1 h) - ce qu'on a testé, ce qui marche, ce qui est en test, par type d'entreprise et par persona ; du lead au revenu ; parcours des deals ; objections ; lecture de l'IA (faits et interprétations séparés) ; questions pour l'équipe ; décisions sur le portefeuille (pause, élargissement, abandon, nouvelles idées) écrites dans Notion. À utiliser quand on dit « /revue », « revue du mois », « bilan outbound », « qu'est-ce qui marche dans nos segments ».
---

# Revue mensuelle du portefeuille de segments

Une fois par mois, avec Lorenzo (et Louis si possible). But : **comprendre quels segments et quelles personas marchent, et fixer le cap du mois suivant.** Le but est le revenu, pas les RDV. Rien sur la performance du copywriting.

**L'IA lit et propose une lecture, l'équipe interprète et décide.** Les chiffres ne sont jamais montrés seuls : toujours avec la lecture et les citations qui les expliquent.

## 1. Données
1. **Notion** : page « Outbound · Portefeuille de segments » (règles), base **Segments**, **Journal des décisions** du mois (voir `/batch`, section Notion, pour les identifiants).
2. **Export CRM** : lancer `set -a; . seela-app/.env.export.local; set +a; curl -sf -H "Authorization: Bearer $CRM_EXPORT_TOKEN" https://everlease.fr/api/crm/batches-export -o <scratchpad>/batches.json` (lecture seule, exception validée par Louis ; ne jamais afficher la clé). Si la clé manque ou si l'appel échoue, demander à Lorenzo d'ouvrir `/admin/crm/batches/export` dans le CRM et de déposer le fichier JSON. **Claude n'accède jamais directement à la base de prod.** Format : `{ generated_at, batches: [...] }`, chaque batch avec `code`, `campaign_name`, `lemlist_campaign_id`, `segment`, `persona`, `source`, `angle`, `cta`, `hypothesis`, `started_at`, `leads`, `companies`, `funnel` (`sent`, `replied`, `positive`, `calls`, `connected`, `rdv`, `deals`, `deals_qualified`, `won_count`, `won_amount`), `deals`, `replies`, `call_notes`. Un deal compte pour le dernier batch de sa société avant sa création ; deal qualifié = `evaluating` ou au-delà ; appel connecté = `pas_interesse`, `a_rappeler`, `interesse` ou `rdv_pris`.
3. **Lemlist** : `get_campaigns_stats` sur les campagnes du périmètre.

Périmètre : batches lancés depuis la dernière revue, plus les plus anciens dont les deals ont bougé (le revenu arrive 1 à 3 mois après l'envoi).

## 2. Ce qu'on montre
**a. Le portefeuille en un coup d'œil** : trois listes — ce qu'on a testé (et le verdict), ce qui marche (validé, élargi), ce qui est en test — avec pour chaque segment : leads contactés, conversations qualifiées, deals qualifiés, CA.

**b. Du lead au revenu** : entonnoir cumulé du mois (contactés → réponses → intéressés → appels connectés → RDV → deals qualifiés → €). Taux seulement quand le dénominateur dépasse 30. Une phrase : où ça casse.

**c. Par type d'entreprise et par persona** : ce qui ressort en cumulé (ex. « Finance répond plus que Direction dans l'industrie »). Comparer seulement des groupes d'au moins ~100 leads, sinon « pas assez de volume ». Un niveau de confiance par constat (faible, moyen, fort), avec les citations qui l'expliquent.

**d. Le parcours des deals** : pour chaque deal outbound créé ou ayant bougé : segment, persona, signal, réponse, appels, étape. Ce qu'ont en commun ceux qui avancent et ceux qui sont perdus.

**e. Objections du mois** : par catégorie (pas de besoin, timing, déjà financé, « ma banque le fait », groupe qui finance, pas le bon interlocuteur, méfiance), 2-3 citations chacune, et ce qui est nouveau.

**f. Lecture de l'IA** en deux colonnes séparées : **faits** (ce que les données montrent) / **interprétations** (ce que l'IA en pense).

**g. Questions pour l'équipe** : 3 à 5 questions ouvertes appuyées sur un constat (ex. « Les refus "groupe qui finance" viennent tous des cliniques : on les exclut du ciblage ? »). Noter les réponses.

## 3. Décisions sur le portefeuille
Après les réponses, proposer puis faire valider, selon les règles de la page Notion :
- segments à **mettre en pause**, **élargir** (voisins ajoutés en Idée en tête de liste) ou **abandonner** ;
- **nouvelles idées** de segments, chacune avec une fiche (type d'entreprise, persona, pourquoi maintenant, source, taille adressable) et une note /15 ;
- **règles** à ajuster si l'expérience le justifie (seuils, rythme) ;
- **cap du mois** : 1 à 3 orientations qui guideront les choix de `/batch`.

L'équipe tranche, l'IA ne décide rien seule.

## 4. Écrire dans Notion (après validation)
- Base **Segments** : statuts, compteurs, `Ce qu'on a appris`, `Verdict`, `Dernière décision` ; nouvelles idées en statut « Idée » avec leur note.
- **Journal des décisions** : une entrée « Revue mensuelle » (cap du mois, apprentissages, réponses aux questions) ; une entrée « Règle modifiée » par règle changée, et mettre à jour la page parente.

On ajoute, on ne supprime jamais. Pas de coût par lead, pas de taux d'ouverture, pas de clics. Aucun nom de financeur.

## Format
1. En 3 lignes : ce qui marche, ce qui ne marche pas, la décision à prendre.
2. Blocs a à f.
3. Les questions (g), puis les décisions après les réponses.

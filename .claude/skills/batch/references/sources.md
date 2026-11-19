# Sources de prospection par segment — everlease

> Référence pour préparer un batch (120 prospects max). Vérifié le 18/11/2026.
> Légende accès : **G** = gratuit · **P** = payant · **API** = automatisable · **Man.** = manuel.
> ⚠️ = point non vérifié ou incertain (voir §6).

---

## 0. Règles d'usage (pour l'IA qui prépare le batch)

1. **Lister** les entreprises avec la source « Liste » du micro-segment → toujours récupérer le **SIREN/SIRET**.
2. **Qualifier** chaque SIREN via `recherche-entreprises.api.gouv.fr` (G, API) : actif, NAF, tranche d'effectif, dirigeants.
3. **Chercher un signal** daté de **moins de 90 jours** dans les sources « Signaux ». Pas de signal vérifiable → pas d'icebreaker « signal », on bascule sur un angle métier générique (ou on écarte le lead).
4. **Trouver le contact** selon la taille (§2), puis email/téléphone via **Fullenrich**.
5. Stocker pour chaque lead : `signal_type`, `signal_date`, `signal_source_url`. Un icebreaker sans URL source = interdit.

---

## 1. Socle commun (valable pour les 3 segments)

| Usage | Source | Accès | Fraîcheur | Remarque |
|---|---|---|---|---|
| Lister par code NAF + zone + effectif | **Base SIRENE** (INSEE, portail-api.insee.fr) | G · API | Quotidienne | Référence officielle. Tranche d'effectif souvent en retard (voir pièges) |
| Fiche entreprise + dirigeants | **Annuaire des Entreprises** (`recherche-entreprises.api.gouv.fr`) | G · API sans clé | Quotidienne | Le plus simple pour qualifier un SIREN |
| Dirigeants, comptes, capital, BODACC agrégé | **Pappers** | G (web) / P (API, surveillance, webhooks) | Quotidienne | Surveillance + webhooks = alertes signaux sur une liste de SIREN |
| Annonces légales (création, nouvel établissement, cession, capital, procédure collective) | **BODACC** (DILA, `bodacc-datadila.opendatasoft.com`) | G · API sans clé | Quotidienne | Source primaire des signaux « juridiques » |
| Marchés publics : avis d'attribution | **BOAMP** (`boamp-datadila.opendatasoft.com`) | G · API sans clé | 2×/jour | Nom du titulaire présent ; montant pas toujours exploitable ⚠️ |
| Marchés publics : contrats conclus avec SIRET titulaire + montant | **DECP consolidées** (data.gouv.fr, CSV/Parquet) | G (fichiers) / P (API tabulaire colibre.fr) | Quotidienne | Fichier lourd (~2,4 Go CSV) → filtrer par NAF/département. Interface : decp.info |
| Offres d'emploi | **API Offres d'emploi France Travail** (francetravail.io) | G ⚠️ · API (compte + licence) | Temps réel | Officiel, filtrable par SIRET/ROME/département |
| Offres d'emploi (complément) | Indeed, Welcome to the Jungle, HelloWork | G · Man. | Temps réel | Pas d'API publique utilisable → manuel ou via Lemlist/Pharow |
| Base B2B enrichie + signaux | **Pharow** | P · export CSV | Variable | Base FR issue de l'open data + signaux (recrutement, levée, capital, croissance) |
| Personnes + signaux | **Lemlist People Database / Signals** | P · MCP Lemlist | Quotidienne | Filtres « Company is hiring », « Last funding date », changement de poste. Couverture TPE/artisans faible |
| Décideurs ETI/PME > 50 sal. | **Sales Navigator** | P · Man./MCP | Temps réel | Meilleur pour DAF/RAF et changements de poste |
| Commerces/cabinets locaux | **Google Maps** | G · Man. (API Places payante) | Variable | Bon pour TPE de proximité (téléphone standard, avis, ouverture récente) |
| Permis de construire / extension de site | **Sitadel – liste des permis** (SDES, data.gouv.fr) | G · fichiers | Mensuelle | SIREN du demandeur si personne morale ⚠️ → signal « extension d'usine/bâtiment » |
| Posts / annonces publiques | LinkedIn (profil entreprise, dirigeant) | G · Man. | Temps réel | Signal fort (nouvelle machine, nouveau site), mais à capturer en URL |

---

## 2. Trouver le BON contact selon la taille

| Taille (salariés) | Persona réaliste | Où trouver le nom | Où trouver email/tél | Remarque |
|---|---|---|---|---|
| 0–9 (TPE, cabinets, artisans) | **Direction uniquement** (gérant/président/praticien titulaire) | Annuaire des Entreprises / Pappers (dirigeants légaux) ; RPPS pour la santé | Fullenrich ; Google Maps pour le standard | Pas de DAF : la finance = expert-comptable externe. Ne pas créer de persona Finance |
| 10–49 | **Direction** (prioritaire) ; Finance rare (comptable/RAF) | Pappers + LinkedIn / Lemlist DB | Fullenrich | Le dirigeant signe le leasing. RAF seulement s'il apparaît sur LinkedIn |
| 50–249 | **Finance** (DAF/RAF) + Direction en parallèle | Sales Navigator, Lemlist DB, Pharow | Fullenrich | DAF = interlocuteur naturel du financement d'équipement |
| 250+ / groupes | Finance (DAF, trésorier, contrôleur de gestion) + Direction de site / achats | Sales Navigator | Fullenrich | Décision souvent au niveau groupe → vérifier la tête de groupe (Pappers) |

Règle : **le dirigeant légal (Pappers) n'est pas toujours le décideur opérationnel** (holding, président personne morale). Si le président est une société, remonter au dirigeant de la holding ou chercher le DG sur LinkedIn.

---

## 3. SANTÉ

### Micro-segments recommandés

| Code | Micro-segment | Équipement typique | NAF | Taille | Pourquoi prometteur |
|---|---|---|---|---|---|
| S1 | **Cabinets dentaires** (SELARL, centres dentaires) | Fauteuil, cone beam (CBCT), scanner intra-oral, laser | 86.23Z | 1–20 | Matériel cher (30–150 k€), renouvellement régulier, installations fréquentes |
| S2 | **Cabinets/centres d'imagerie médicale** | IRM, scanner, échographe, mammographe | 86.22A | 10–200 | Tickets élevés ; IRM/scanner = autorisation ARS → signal officiel |
| S3 | **Cliniques vétérinaires** (segment adjacent ⚠️) | Radio numérique, échographe, scanner, bloc | 75.00Z | 3–50 | Consolidation forte du secteur, équipement lourd, peu sollicitées sur le financement |

### Où LISTER

| Code | Meilleure source | Accès | Comment |
|---|---|---|---|
| S1 | **SIRENE NAF 86.23Z** (personnes morales : SELARL/SELAS) | G · API | Filtrer formes juridiques sociétés (pas les praticiens en nom propre, trop petits) + département |
| S1 | **Annuaire Santé / RPPS** (ANS, extraction PS_LibreAcces ou API FHIR) | G · fichiers/API | Profession « Chirurgien-dentiste » → praticiens + lieu d'exercice + SIRET de la structure |
| S1 | Google Maps « centre dentaire » | G · Man. | Repérer les centres récents / en croissance (avis récents, nombre de praticiens) |
| S2 | **FINESS+** (ANS, flux JSON quotidien depuis juillet 2026) — équipements matériels lourds | G · fichiers | Liste des sites autorisés IRM/scanner. ⚠️ Les anciennes extractions FINESS data.gouv sont **gelées depuis mai 2026** ; conversion CSV mensuelle communautaire « FINESS en CSV » sur data.gouv |
| S2 | SIRENE NAF 86.22A + Pharow (effectif ≥ 10) | G / P | Cabinets de radiologie libéraux structurés en SEL |
| S3 | SIRENE NAF 75.00Z + **annuaire de l'Ordre des vétérinaires** (veterinaire.fr) | G · API / Man. | Ordre = vérifier le type d'établissement (clinique, CHV) ⚠️ pas d'export open data connu |

### Où trouver le CONTACT

| Code | Persona | Source |
|---|---|---|
| S1 | Direction = praticien gérant | Pappers (gérant SELARL) + RPPS (nom/prénom exacts) → Fullenrich. Lemlist DB faible sur ce profil |
| S2 | Direction = médecin radiologue gérant ; Finance = DAF dans les groupes d'imagerie | Pappers + Sales Navigator (« directeur administratif et financier » + imagerie) |
| S3 | Direction = vétérinaire associé gérant ; Finance = DAF dans les groupes (réseaux de cliniques) | Pappers ; Sales Navigator pour les groupes. ⚠️ Beaucoup de cliniques appartiennent déjà à un groupe qui centralise les achats → vérifier la tête de groupe |

### SIGNAUX « pourquoi maintenant »

| Signal | Segment | Source concrète | Accès | Fraîcheur | Fiabilité |
|---|---|---|---|---|---|
| Création d'une SELARL / SELAS (installation) | S1, S2, S3 | BODACC (annonce « création ») / Pappers | G · API | J+quelques jours | ★★★ |
| Ouverture d'un **nouvel établissement** / second cabinet | S1, S2, S3 | BODACC (« création d'établissement ») | G · API | Quotidienne | ★★★ |
| Nouveau praticien rattaché à la structure | S1 | RPPS : comparer deux extractions (diff lieu d'exercice) | G · fichiers | Hebdo/quotidienne | ★★ (retards de mise à jour) |
| **Autorisation ARS** d'IRM/scanner (nouvelle ou renouvellement) | S2 | FINESS+ (équipements matériels lourds) + décisions publiées au recueil des actes administratifs (RAA) de l'ARS | G · fichiers / Man. | Variable selon ARS | ★★★ (signal le plus fort du segment) |
| Recrutement (assistant(e) dentaire, manipulateur radio, ASV) | S1, S2, S3 | API France Travail ; Indeed ; HelloWork | G · API / Man. | Temps réel | ★★ (croissance d'activité) |
| Cession / reprise de cabinet | S1, S3 | BODACC (« vente et cession ») | G · API | Quotidienne | ★★★ (repreneur = renouvellement matériel probable) |
| Rachat par un groupe / fusion | S2, S3 | BODACC + presse sectorielle | G | Variable | ★ pour nous (achats centralisés → plutôt mauvais signal) |
| Post LinkedIn « nouveau cone beam / nouveau scanner » | S1, S2, S3 | LinkedIn | G · Man. | Temps réel | ★★ (achat déjà fait → angle « prochain équipement » ou lease-back) |

---

## 4. INDUSTRIE

### Micro-segments recommandés

| Code | Micro-segment | Équipement typique | NAF | Taille | Pourquoi prometteur |
|---|---|---|---|---|---|
| I1 | **Usinage / mécanique de précision / décolletage** (sous-traitants) | Centres d'usinage CN, tours, machines 5 axes, métrologie | 25.62A, 25.62B, 25.61Z, 28.41Z | 10–100 | Parc machines lourd, renouvellement constant, dirigeants accessibles |
| I2 | **Agroalimentaire PME** | Lignes de conditionnement, froid industriel, fours, cuves | 10.13A/B, 10.51x, 10.71x, 10.89Z, 11.0x | 10–250 | Investissements réguliers (normes, cadence), signaux réglementaires publics |
| I3 | **Plasturgie / emballage / imprimerie** | Presses à injecter, extrudeuses, machines d'impression | 22.21Z, 22.22Z, 22.29A, 17.21x, 18.12Z | 10–150 | Machines coûteuses, pression transition énergétique (machines électriques) |

### Où LISTER

| Code | Meilleure source | Accès | Comment |
|---|---|---|---|
| I1, I2, I3 | **Pharow** (NAF + effectif + CA + région) | P · CSV | Meilleur rapport qualité/effort pour PME industrielles 10–250 |
| I1, I2, I3 | SIRENE par NAF (contrôle et complément) | G · API | Vérifier activité réelle (NAF parfois faux, voir pièges) |
| I2 | **Liste des établissements agréés** (agrément sanitaire, ministère de l'Agriculture) ⚠️ | G · fichiers | Confirme une vraie activité de transformation (pas un négoce) |
| I2, I3 | **Géorisques – installations classées (ICPE)** | G · API | Sites industriels réels avec régime (autorisation/enregistrement) = taille d'usine |
| I1 | Listes d'exposants de salons (Global Industrie, Midest) | G · Man. | Entreprises actives commercialement ⚠️ listes pas toujours exportables |

### Où trouver le CONTACT

| Taille | Persona | Source |
|---|---|---|
| 10–49 | Direction (PDG/DG, souvent fondateur ou repreneur) | Pappers → LinkedIn → Fullenrich |
| 50–250 | Finance (DAF/RAF) + Direction ; parfois directeur industriel/usine en influenceur | Sales Navigator, Lemlist DB, Pharow |
| Filiales de groupes | DAF groupe | Pappers (tête de groupe) + Sales Navigator |

### SIGNAUX « pourquoi maintenant »

| Signal | Segment | Source concrète | Accès | Fraîcheur | Fiabilité |
|---|---|---|---|---|---|
| Recrutement opérateurs/régleurs CN, conducteurs de ligne (= hausse de charge) | I1, I2, I3 | API France Travail ; Indeed ; Lemlist « Company is hiring » | G / P | Temps réel | ★★ |
| Lauréat **France 2030** (Première Usine, Industrie du futur, volet régionalisé) | I1, I2, I3 | Communiqués entreprises.gouv.fr (DGE) ; cartographie des lauréats sur info.gouv.fr ; communiqués préfectures de région | G · Man. | À chaque vague | ★★★ (projet d'investissement public, cofinancement à compléter). ⚠️ pas de jeu open data propre |
| Aide **BPI / Région** (prêt, subvention investissement) | I1, I2, I3 | Communiqués régionaux, presse locale, posts LinkedIn ⚠️ pas de base nominative ouverte et exhaustive | G · Man. | Variable | ★★ |
| **Augmentation de capital** | I1, I2, I3 | BODACC / Pappers | G · API | Quotidienne | ★★ (peut être une simple opération juridique) |
| Nouvel établissement / nouveau site | I1, I2, I3 | BODACC ; Sitadel (permis de construire avec SIREN) ⚠️ | G | Quotidienne / mensuelle | ★★★ |
| Nouveau dossier ICPE (extension, nouvelle installation) | I2, I3 | Géorisques ; avis d'enquête publique en préfecture | G · API / Man. | Variable | ★★★ |
| Reprise / cession (nouveau dirigeant) | I1, I3 | BODACC (« vente et cession », modification dirigeant) | G · API | Quotidienne | ★★★ (repreneur = plan d'investissement) |
| Changement de DAF / nouveau DG | I1, I2, I3 | Sales Navigator ; Lemlist « Contact changed jobs » | P | Quotidienne | ★★ (fenêtre des 90 premiers jours) |
| Levée de fonds | I3 (rare en PME) | Pharow ; Lemlist « Company raised funds » ; presse | P | Variable | ★ (peu fréquent hors deeptech) |

---

## 5. BTP

### Micro-segments recommandés

| Code | Micro-segment | Équipement typique | NAF | Taille | Pourquoi prometteur |
|---|---|---|---|---|---|
| B1 | **Travaux publics / terrassement / VRD / réseaux** | Pelles, chargeuses, mini-pelles, camions, compacteurs | 42.11Z, 42.21Z, 42.22Z, 43.12A, 43.12B | 10–100 | Engins = gros tickets ; marchés publics = **signal daté et vérifiable** |
| B2 | **Rénovation énergétique / CVC / couverture RGE** | Utilitaires, nacelles, outillage, pompes à chaleur de démo | 43.22B, 43.21A, 43.91A/B, 43.29A | 3–50 | Liste officielle à jour quotidiennement ; flottes d'utilitaires à renouveler |
| B3 | **Gros œuvre / maçonnerie PME** | Grues, coffrages, utilitaires, mini-engins | 41.20A, 41.20B, 43.99C | 10–100 | Marchés publics + recrutement massif = signaux fréquents |

### Où LISTER

| Code | Meilleure source | Accès | Comment |
|---|---|---|---|
| B1, B3 | **DECP consolidées** (titulaires de marchés) filtrées par CPV travaux (45xxxxxx) + département | G · fichiers | Donne directement les entreprises qui **gagnent** des marchés, avec SIRET et montant |
| B1, B3 | Pharow (NAF + effectif + région) | P · CSV | Pour la base hors marchés publics |
| B2 | **Liste des entreprises RGE** (ADEME, data.gouv.fr) | G · API/CSV | MAJ quotidienne, SIRET + domaines de travaux + qualification (Qualibat, Qualit'EnR…) |
| B2 | Google Maps (« couvreur », « chauffagiste ») | G · Man. | Artisans 3–10 sal. absents de Lemlist DB ; téléphone standard |

### Où trouver le CONTACT

| Taille | Persona | Source |
|---|---|---|
| 3–19 (artisans, B2) | Direction (gérant, souvent sur le chantier → téléphone > email) | Pappers + Google Maps (tél.) + Fullenrich (mobile) |
| 20–99 (B1, B3) | Direction ; Finance = RAF / assistante de direction-comptable | Pappers, LinkedIn, Lemlist DB (couverture moyenne) |
| 100+ | Finance (DAF/RAF) + directeur matériel / parc | Sales Navigator |

### SIGNAUX « pourquoi maintenant »

| Signal | Segment | Source concrète | Accès | Fraîcheur | Fiabilité |
|---|---|---|---|---|---|
| **Marché public attribué** (avec montant et acheteur) | B1, B3 (B2 parfois) | DECP (SIRET titulaire + montant) ; BOAMP avis d'attribution | G · fichiers / API | J+quelques jours à semaines | ★★★ (meilleur icebreaker BTP : « félicitations pour le marché X de la commune Y ») |
| Recrutement conducteurs d'engins, chefs de chantier, compagnons | B1, B2, B3 | API France Travail ; Indeed ; HelloWork | G | Temps réel | ★★ |
| Nouvelle qualification RGE / nouveau domaine | B2 | Diff entre deux versions de la liste RGE ADEME | G · API | Quotidienne | ★★ (nouvelle activité = nouveau matériel) |
| Nouvel établissement / agence | B1, B2, B3 | BODACC | G · API | Quotidienne | ★★★ |
| Reprise / cession | B1, B2, B3 | BODACC | G · API | Quotidienne | ★★★ |
| Post LinkedIn chantier / livraison d'engin | B1, B3 | LinkedIn | G · Man. | Temps réel | ★★ |

---

## 6. Pièges

| Piège | Effet | Parade |
|---|---|---|
| **Tranche d'effectif SIRENE en retard** (souvent N-2, ou « non renseignée ») | Taille fausse → mauvais persona | Croiser avec Pappers (comptes) / LinkedIn |
| **Code NAF déclaratif et parfois faux** (holding classée en activité, négoce classé en production) | Hors cible | Vérifier site web / ICPE / agrément / Google Maps |
| **Anciennes extractions FINESS gelées depuis mai 2026** | Données santé périmées | Utiliser FINESS+ (ANS) ou la conversion CSV mensuelle |
| **BODACC « augmentation de capital »** souvent technique (incorporation de réserves, holding) | Faux signal de croissance | Ne l'utiliser qu'avec un 2ᵉ signal (recrutement, site) |
| **Offres d'emploi multi-diffusées / permanentes** (même annonce reposée depuis 6 mois) | Faux signal | Vérifier date de 1ʳᵉ publication ; préférer ≥ 2 offres récentes |
| **Marchés publics à bons de commande / accords-cadres** | Montant « maximum » ≠ chiffre réel | Formuler « attribution du marché X », jamais le montant comme acquis |
| **Signal déjà « consommé »** (machine achetée et annoncée) | Besoin passé | Angle lease-back ou « prochain investissement » |
| **Groupes / réseaux** (cliniques vétérinaires, imagerie, filiales industrielles) | Décision centralisée | Remonter à la tête de groupe (Pappers) ; sinon écarter |
| **Président personne morale** (holding) | Mauvais nom de contact | Remonter à la holding ou chercher le DG |
| **RGPD B2B – email** : prospection sans consentement préalable possible, mais message lié à la fonction du destinataire, information + opt-out dans chaque email, base « intérêt légitime » documentée. La CNIL a publié le 16/10/2026 un cadre sur la reconstitution d'emails pros (déduits) : autorisée sous intérêt légitime, avec les mêmes obligations | Plainte / sanction CNIL | Lien de désinscription Lemlist, mention de la source de la donnée, registre de traitement, liste d'exclusion partagée |
| **Démarchage téléphonique** : depuis le 11/08/2026, consentement préalable obligatoire **pour les consommateurs** (art. L223-1 C. conso). Le B2B reste hors de ce régime mais encadré par le RGPD | Risque sur les praticiens/artisans appelés sur un mobile perso | Appeler sur des numéros pros ; objet de l'appel strictement lié à l'activité |
| **Données de santé** : le RPPS est public (charte de réutilisation ANS) mais n'autorise pas un usage commercial au-delà de cette charte ⚠️ | Risque juridique | Utiliser le RPPS pour identifier la structure/le titulaire, pas pour profiler |
| **Scraping LinkedIn / Indeed / Google Maps** | Conditions d'utilisation interdites, blocage de compte | Usage manuel ou via outils autorisés (Sales Nav, Lemlist, Pharow) |
| **Lemlist DB / Pharow faibles sur TPE de santé et artisans BTP** | Peu de résultats ou emails génériques | Sources publiques + Fullenrich + téléphone |

---

## 7. Points incertains (à vérifier avant d'automatiser)

| Point | Statut |
|---|---|
| API Offres d'emploi France Travail : gratuité et quotas | Accès par compte + contrat de licence confirmé ; gratuité non confirmée par une source officielle |
| DECP : API gratuite | Fichiers CSV/Parquet gratuits confirmés ; l'API tabulaire (colibre.fr) est sur abonnement |
| BOAMP : montant attribué exploitable | Contradictoire selon les sources → utiliser DECP pour les montants |
| Sitadel : présence du SIREN du demandeur | Non revérifié en 2026 |
| France 2030 : liste exhaustive téléchargeable | Pas de jeu open data trouvé ; cartographie info.gouv.fr + communiqués DGE/préfectures |
| Aides BPI : base nominative | Aucune base publique exhaustive trouvée |
| Liste des établissements agréés (agroalimentaire) : format et fraîcheur | Non revérifié en 2026 |
| Annuaire de l'Ordre des vétérinaires : export | Consultation manuelle uniquement, à confirmer |
| Couverture réelle des signaux Pharow / Lemlist sur les PME françaises non tech | À tester sur un échantillon de 50 SIREN par segment |
| Charte de réutilisation RPPS et usage commercial | À faire valider (juriste) avant un usage à grande échelle |

---

## Sources consultées

- BODACC API — https://www.data.gouv.fr/dataservices/672cf66ea47b8d4c15d13d5b
- DECP consolidées — https://www.data.gouv.fr/datasets/donnees-essentielles-de-la-commande-publique-consolidees-format-tabulaire
- BOAMP API — https://www.api.store/france-api/etalab-api/api-boamp-api
- FINESS (extractions gelées) — https://www.data.gouv.fr/datasets/finess-extraction-du-fichier-des-etablissements
- FINESS en CSV (conversion FINESS+) — https://www.data.gouv.fr/datasets/finess-en-csv-conversion-mensuelle-de-finess
- Annuaire Santé (ANS) — https://esante.gouv.fr/offres-services/annuaire-sante/acceder-aux-donnees
- Liste des entreprises RGE — https://www.data.gouv.fr/datasets/liste-des-entreprises-rge
- API Offres d'emploi — https://www.data.gouv.fr/dataservices/api-offres-demploi
- Lemlist Signals — https://help.lemlist.com/en/articles/14321798-signals-overview
- Pappers surveillance / webhooks — https://www.pappers.fr/webhooks
- France 2030 lauréats — https://www.info.gouv.fr/france-2030/laureats ; https://www.entreprises.gouv.fr/espace-presse/france-2030-13-nouveaux-laureats-du-dispositif-premiere-usine-pour-les-8e-et-9e
- CNIL prospection électronique — https://cnil.fr/fr/node/168596 ; reconstitution d'emails pros — https://www.cnil.fr/fr/reconstitution-adresses-professionnelles-quel-cadre
- Démarchage téléphonique (DGCCRF) — https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/demarchage-telephonique-professionnels-mettez-vous-en-conformite-avec-la-reglementation

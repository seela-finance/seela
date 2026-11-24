# Pièces du dossier et « Mon compte »

Décidé avec Louis le 24/11/2026. Avant : les pièces circulaient par email après le choix de l'offre, et l'onboarding se terminait sur un dépôt de bilan.

## Les pièces

Deux moments, deux listes (`lib/pieces.ts`, `requiredPieces`) :

**Avant transmission au financeur** (phase `dossier`) :
- Extrait Kbis de moins de 3 mois.
- Liasse fiscale du dernier exercice clos.
- Situation comptable intermédiaire si le dernier exercice clos date de plus de 6 mois. Hypothèse : clôture au 31/12, donc requise passé le 30 juin. L'équipe peut dispenser.
- Société de moins d'un an (année de création = année en cours ou précédente) : statuts signés et prévisionnel à la place de la liasse.

**Après l'accord du financeur** (phase `contrat`, dès `leaser_confirmed`) :
- Pièce d'identité du dirigeant.
- RIB.

Ces deux pièces sont **effacées 30 jours après la décision du financeur** (acceptation, contrat actif ou refus), sauf si un autre dossier est encore en cours : cron `/api/cron/purge-pieces`, chaque jour à 5h30 UTC. Le fichier est retiré du bucket, la ligne reste (`deleted_at`).

## Côté client

- **`/app/compte`** : la société (lecture, données du registre), les pièces avec leur état (*à déposer*, *en vérification*, *validée*, *refusée* avec le motif, *non requise*), les coordonnées. Un distributeur partenaire n'a pas le bloc pièces.
- Dépôt : le navigateur écrit dans le bucket privé `documents`, sous `<user>/pieces/`, comme pour les devis ; puis `registerPieceAction` enregistre la pièce et prévient l'équipe. Une liasse déposée relance l'analyse de bilan et le score, comme avant à l'onboarding.
- Le client retire une pièce tant qu'elle n'est pas validée. Un refus rouvre le dépôt.
- **Tableau de bord** : la bannière devient « Pièces du dossier : 2/3 validées » et renvoie vers « Mon compte ».
- **Onboarding** en 3 étapes (pays, société, coordonnées). Le score est calculé à la fin ; une inscription déjà terminée renvoie vers « Mon compte ».

## Côté équipe

- **Fiche société du CRM** et **fiche dossier** : section « Pièces du dossier » avec aperçu (lien signé 1 h), *Valider*, *Refuser* avec motif (envoyé au client), *Dispenser* une pièce non déposée (motif interne). Tout est journalisé dans `admin_events`.
- **Transmission au financeur** : « Valider et transmettre » exige les pièces de la phase `dossier` validées ou dispensées. Sinon, la dérogation « Transmettre quand même » avec un motif, journalisée (`Transmission malgré des pièces manquantes`). Le contrôle est fait côté serveur (`validateOfferAction`), pas seulement dans le bouton.
- À l'accord du financeur, le client reçoit l'email « Dernière étape avant votre contrat » pour la pièce d'identité et le RIB.

## Côté partenaire

« Mes clients » affiche « Pièces 2/3 » pour chaque dossier : le distributeur relance son client, mais ne dépose ni ne voit les pièces.

## Données

`company_documents` (migration `20261124100000_company_documents.sql`) : `company_id`, `request_id` facultatif, `kind`, `status`, `path` (null pour une dispense), `file_name`, `mime_type`, `size_bytes`, `uploaded_by`, `reviewed_by`, `reviewed_at`, `review_note`, `deleted_at`. Le client lit les pièces de sa société ; toute écriture passe par le serveur. Avant la migration, les lectures renvoient une liste vide : rien ne bloque.

## Emails

- Équipe : « Pièce à contrôler » à chaque dépôt (`LEADS_EMAIL`, envoyé même hors production).
- Client : « Une pièce de votre dossier est à redéposer » au refus ; « Dernière étape avant votre contrat » à l'accord du financeur.

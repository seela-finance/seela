# Le contrat vu par le client et ses demandes

Décidé avec Louis le 24/11/2026. Avant : la fiche contrat affichait les chiffres de l'offre et trois liens `mailto:` ; rien ne gardait trace des demandes.

## La fiche contrat (`/app/contrats/[id]`)

Visible pour un dossier en phase contrat (`leaser_confirmed`, `active`), au client propriétaire du dossier.

- **L'essentiel** : mensualité, durée, montant financé, coût total, financeur, taux, fournisseur, date de démarrage et fin prévue.
- **Échéancier indicatif** (`lib/contract-requests.ts`, `buildSchedule`) : dès que l'équipe a saisi la date de démarrage, une échéance par mois à partir de cette date, au loyer de l'offre choisie. Les échéances passées sont réputées réglées, la prochaine est repérée. Mention obligatoire : indicatif, hors assurance et services, l'échéancier contractuel est celui du financeur. Sans date de démarrage : la frise des étapes, comme avant.
- **Documents** : le devis ou la facture d'origine (lien signé 1 h) ; le contrat de location reste « à venir ».
- **Demandes** : voir ci-dessous.

Utile aux clients directs comme aux clients apportés par un distributeur : le dossier appartient au client dans les deux cas.

## Les demandes

Quatre natures (`CONTRACT_REQUEST_KINDS`) :

| Nature | Ouverte quand |
|---|---|
| Report d'échéance | contrat actif |
| Rachat anticipé | contrat actif |
| Ajout ou remplacement de matériel | dès l'accord du financeur |
| Question administrative | dès l'accord du financeur |

Le client choisit la nature et écrit un message (10 à 2 000 caractères). La demande est enregistrée en `recue`, l'équipe reçoit l'email « Demande client » (`LEADS_EMAIL`, envoyé même hors production) avec le message et le lien vers la fiche dossier. Le client voit aussitôt sa demande et son état sur la fiche contrat ; on lui promet un rappel sous 24 h ouvrées, jamais une décision : elle reste au financeur.

États (`CONTRACT_REQUEST_STATUSES`) : `recue` → `en_cours` → `repondue` → `close`. L'équipe peut répondre directement depuis `recue`, compléter une réponse (`repondue` → `en_cours`), et clore à tout moment. Une demande close ne bouge plus.

## Côté équipe

- **Onglet « Demandes »** (`/admin/demandes`, section Financement, tous les rôles) : les demandes ouvertes en tête, puis toutes ; chaque ligne mène à la fiche dossier.
- **Fiche dossier** : section « Demandes du client » (dossiers en phase contrat) avec *Prendre en charge*, *Répondre* (la réponse est envoyée au client par email et affichée sur sa fiche contrat), *Clore*. Ouvert aux rôles ayant `add_notes` (admin et commercial) : c'est de la relation client, pas une décision de financement. Tout est journalisé dans `admin_events` (`Demande client prise en charge`, `Réponse à une demande client`, `Demande client close`).

## Côté partenaire

« Mes clients » affiche sous le statut du dossier « Demande du client : Report d'échéance · reçue » pour les demandes ouvertes : la nature et l'état, jamais le message ni la réponse.

## Données

`contract_requests` (migration `20261124180000_contract_requests.sql`) : `request_id`, `company_id`, `kind`, `status`, `message`, `created_by`, `answer`, `answered_by`, `answered_at`, `closed_at`. Le client lit les demandes de ses dossiers (propriétaire ou même société) ; toute écriture passe par le serveur (service role). Avant la migration, les lectures renvoient une liste vide et le formulaire renvoie « Envoi impossible » : rien ne casse ailleurs.

## Emails

- Équipe : « Demande client — nature · société · référence » à chaque demande.
- Client : « Réponse à votre demande » quand l'équipe répond, avec le texte de la réponse et le lien vers la fiche contrat. Le destinataire est le compte rattaché au dossier.

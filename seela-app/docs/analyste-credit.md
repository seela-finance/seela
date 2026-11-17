# Agent analyste crédit

Analyse chaque demande de financement comme le ferait l'analyste crédit d'un financeur, et tient l'équipe
au courant des demandes reçues.

## Ce qu'il fait

1. **À la soumission** d'un dossier (`POST /api/requests/[id]/submit`), après la réponse au client :
   lecture du dossier (société, contact, lignes, offres, historique chez everlease), du **registre des
   entreprises** (société cliente et fournisseur : état, création, dirigeants, comptes publiés) et de la
   **réponse de chaque financeur** aux barèmes actuels ; calcul des indicateurs et alertes
   (`lib/credit-analysis.ts`) ; analyse par le modèle ; enregistrement dans `credit_analyses` ;
   **email à l'équipe** (`LEADS_EMAIL`, et Slack si `SLACK_WEBHOOK_URL` est défini).
2. **Dans la fiche dossier** (`/admin/dossiers/[id]`) : section « Analyse crédit » (avis, synthèse,
   alertes, indicateurs, points forts et de vigilance, questions au client, pièces à demander, placement).
   Un membre avec le droit `decide_requests` peut relancer l'analyse ; la relance est journalisée.
3. **Récapitulatif planifié** (`GET /api/cron/credit-recap`, cron Vercel `vercel.json`, les matins de
   semaine à 7 h Paris) : dossiers soumis depuis la veille (depuis vendredi le lundi), analyse de ceux qui
   n'en ont pas (3 par passage), email de synthèse à l'équipe.

Les avis sont indicatifs : « favorable », « favorable sous réserve », « défavorable », « à compléter ».
Un conseiller vérifie avant toute décision. Le modèle ne reçoit ni l'email ni le téléphone du contact.

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Appel au modèle (déjà utilisée par l'analyse de document) | requise |
| `CREDIT_ANALYST_MODEL` | Modèle utilisé par l'analyste | `claude-opus-5-5` |
| `CRON_SECRET` | Protège `/api/cron/credit-recap` ; Vercel l'envoie en `Authorization: Bearer` | requise pour le récap |
| `LEADS_EMAIL` | Destinataires internes (liste séparée par des virgules) | email du fondateur |
| `APP_URL` | Base des liens vers le back-office dans les emails | `https://everlease.fr` |
| `SLACK_WEBHOOK_URL` | Notification Slack facultative | — |

Les emails de l'analyste sont internes (`alwaysSend`) : ils partent même hors production. Les parcours de
test (`npm run test:staging`) vident les clés Resend et Slack et simulent le modèle (`e2e/support/fake-anthropic.mjs`).

## Lancer le récapitulatif à la main

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://everlease.fr/api/cron/credit-recap?days=7&send=0"
```

`days` (1 à 90) fixe la fenêtre, `limit` (0 à 5) le nombre d'analyses manquantes lancées, `send=0` renvoie
le JSON sans envoyer l'email.

## Migration

`supabase/migrations/20261117180000_credit_analyses.sql` : table `credit_analyses` (service role uniquement),
à appliquer sur le staging puis en prod avant le déploiement.

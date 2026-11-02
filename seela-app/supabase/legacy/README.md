# Scripts SQL historiques

Scripts appliqués à la main en prod avant la baseline (`../migrations/*_baseline.sql`).
**Déjà appliqués et inclus dans la baseline : ne pas les rejouer.** Conservés pour l'historique.

- `test-leaser.sql` : crée le leaser de test lié à un compte. La colonne `test_user_id` est dans la baseline ;
  la ligne « Leaser Test » ne l'est pas (elle dépend d'un compte). Rejouable sur staging pour y créer un leaser de test.

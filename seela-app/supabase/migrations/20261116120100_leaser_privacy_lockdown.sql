-- Anonymat des financeurs, étape 2 sur 2. À appliquer APRÈS le déploiement du code qui lit `public_name`
-- (l'ancien code lit `offers(*)` et `leasers` avec la session du client : il échouerait).
-- Le serveur (service role) garde tout ; le client et le visiteur anonyme ne lisent plus rien des leasers.
-- Rejouable.

DROP POLICY IF EXISTS leasers_read ON public.leasers;
DROP POLICY IF EXISTS leaser_rates_read ON public.leaser_rates;
DROP POLICY IF EXISTS leaser_advantages_read ON public.leaser_advantages;
DROP POLICY IF EXISTS leaser_equipment_categories_read ON public.leaser_equipment_categories;
DROP POLICY IF EXISTS leaser_excluded_sectors_read ON public.leaser_excluded_sectors;
DROP POLICY IF EXISTS leaser_financing_types_read ON public.leaser_financing_types;

REVOKE ALL ON public.leasers, public.leaser_rates, public.leaser_advantages, public.leaser_equipment_categories,
  public.leaser_excluded_sectors, public.leaser_financing_types FROM anon, authenticated;

-- Offres : le client lit les siennes (policy existante) mais plus le nom ni l'identifiant du leaser.
-- Les requêtes client listent donc leurs colonnes (pas de `*`).
REVOKE SELECT ON public.offers FROM anon, authenticated;
GRANT SELECT (
  id, request_id, public_name, monthly_payment, duration_months, status, selected, rate, total_cost, notes,
  confirmed_at, seela_validated_at, leaser_confirmed_at, source, previous_terms, conditions, client_message,
  periodicite, frais_dossier, depot_garantie, created_at
) ON public.offers TO authenticated;

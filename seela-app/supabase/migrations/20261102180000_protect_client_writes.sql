-- #21 : le navigateur n'écrit plus ni statut, ni montant, ni offre, ni ligne.
-- Soumission, confirmation d'offre et refus de contre-offre passent par des routes serveur
-- (service role, propriétaire vérifié) : /api/requests/[id]/submit, /api/offers/[id]/confirm|decline.
-- À appliquer APRÈS le déploiement de ces routes (sinon la soumission depuis l'ancien code échoue).

-- Dossiers : le client peut seulement créer un brouillon, sans montant ; plus aucune modification.
REVOKE UPDATE, DELETE ON public.financing_requests FROM anon, authenticated;
CREATE POLICY requests_insert_draft_only ON public.financing_requests AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (status = 'draft' AND total_amount IS NULL);

-- Offres et lignes : lecture seule pour le client.
REVOKE INSERT, UPDATE, DELETE ON public.offers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.line_items FROM anon, authenticated;

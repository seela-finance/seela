-- Les clients lisent leur société et leurs collègues, mais pas les champs internes du CRM
-- (statut commercial, secteur, source, signal, propriétaire, détail du score, persona, liens de prospection).
-- Le serveur (service role) et les fonctions SECURITY DEFINER ne sont pas concernés. Rejouable.

REVOKE SELECT ON public.companies FROM authenticated;
GRANT SELECT (
  id, siren, domain, name, legal_form, naf_code, creation_year, address, country,
  revenue_bracket, age_bracket, headcount_bracket, revenue_declared, result_declared,
  kyc_completed, financial_docs_uploaded, onboarding_completed, seela_score, seela_score_grade,
  created_at, updated_at
) ON public.companies TO authenticated;

REVOKE SELECT ON public.contacts FROM authenticated;
GRANT SELECT (
  id, company_id, user_id, first_name, last_name, email, phone, job_title, created_at, updated_at
) ON public.contacts TO authenticated;

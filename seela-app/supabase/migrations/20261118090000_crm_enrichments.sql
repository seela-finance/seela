-- Enrichissements de téléphone (FullEnrich) lancés à la main avant une session d'appels : suivi de la demande,
-- contacts concernés, crédits consommés, numéros trouvés. Lisible par le serveur seulement. Rejouable.

CREATE TABLE IF NOT EXISTS public.crm_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'fullenrich',
  external_id text NOT NULL,
  status text NOT NULL DEFAULT 'CREATED',
  contact_ids uuid[] NOT NULL DEFAULT '{}',
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  credits integer,
  found integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS crm_enrichments_created_idx ON public.crm_enrichments (created_at DESC);

ALTER TABLE public.crm_enrichments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_enrichments FROM anon, authenticated;

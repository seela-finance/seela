-- Batches outbound : 1 batch = 1 campagne Lemlist (créé par la synchro), et la copie des variables reçues par chaque lead
-- (icebreaker, positionnement, CTA…) au moment du batch. Un deal est attribué au dernier batch de sa société avant sa création.
-- Réservé à l'équipe (service role). Ajouts seulement. Rejouable.

CREATE TABLE IF NOT EXISTS public.crm_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lemlist_campaign_id text NOT NULL UNIQUE,
  campaign_name text,
  code text,
  segment text,
  persona text,
  source text,
  angle text,
  cta text,
  hypothesis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_batch_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.crm_batches(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  lemlist_lead_id text,
  entered_at timestamptz NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, contact_id)
);

CREATE INDEX IF NOT EXISTS crm_batch_leads_company_idx ON public.crm_batch_leads (company_id, entered_at);

ALTER TABLE public.crm_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_batch_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_batches FROM anon, authenticated;
REVOKE ALL ON public.crm_batch_leads FROM anon, authenticated;

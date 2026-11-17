-- Pré-pipe de prospection porté par la société (lead status, canal inbound/outbound, signal d'entrée,
-- raison de sortie, date de relance), nouvelle issue d'appel « société disqualifiée », nouvelles étapes du
-- pipe Deals, réglages du CRM (propriétaire des nouveaux leads, seuil de séquence Lemlist). Rejouable.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_status text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_channel text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_signal text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_entered_at timestamptz;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_exit_reason text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lead_next_date date;

DO $$
BEGIN
  ALTER TABLE public.companies ADD CONSTRAINT companies_lead_status_check
    CHECK (lead_status IS NULL OR lead_status IN ('a_contacter', 'qualification', 'tentative', 'connecte', 'rdv_pris', 'disqualifie', 'pas_maintenant'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.companies ADD CONSTRAINT companies_lead_channel_check
    CHECK (lead_channel IS NULL OR lead_channel IN ('inbound', 'outbound'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS companies_lead_status_idx ON public.companies (lead_status) WHERE lead_status IS NOT NULL;

ALTER TABLE public.crm_activities DROP CONSTRAINT IF EXISTS crm_activities_call_outcome_check;
ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_call_outcome_check
  CHECK (call_outcome IS NULL OR call_outcome IN ('pas_de_reponse', 'messagerie', 'pas_interesse', 'a_rappeler', 'interesse', 'rdv_pris', 'societe_disqualifiee'));

ALTER TABLE public.crm_deals DROP CONSTRAINT IF EXISTS crm_deals_stage_check;
UPDATE public.crm_deals SET stage = CASE stage
  WHEN 'proposition' THEN 'evaluating'
  WHEN 'signe' THEN 'won'
  WHEN 'perdu' THEN 'lost'
  WHEN 'a_recontacter' THEN 'stand_by'
  WHEN 'en_conversation' THEN 'interested'
  WHEN 'a_contacter' THEN 'pending_qualification'
  WHEN 'rdv_pris' THEN 'pending_qualification'
  ELSE stage END;
ALTER TABLE public.crm_deals ALTER COLUMN stage SET DEFAULT 'pending_qualification';
ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_stage_check
  CHECK (stage IN ('pending_qualification', 'interested', 'evaluating', 'negociating', 'closing_confirmed', 'won', 'lost', 'stand_by'));

CREATE TABLE IF NOT EXISTS public.crm_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_settings FROM anon, authenticated;

-- Activités venues d'outils externes (Lemlist d'abord) : source, identifiant externe (jamais deux fois le même
-- événement), type d'événement et détails. Type LinkedIn ajouté. État de synchronisation par source.
-- Ajouts seulement : le code déjà déployé continue de fonctionner. Rejouable.

ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manuel';
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS event text;
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS metadata jsonb;

DO $$
BEGIN
  ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_source_external_key UNIQUE (source, external_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

ALTER TABLE public.crm_activities DROP CONSTRAINT IF EXISTS crm_activities_type_check;
ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_type_check
  CHECK (type IN ('call', 'email', 'note', 'meeting', 'linkedin'));

CREATE TABLE IF NOT EXISTS public.crm_sync_state (
  source text PRIMARY KEY,
  last_event_at timestamptz,
  last_run_at timestamptz,
  running_since timestamptz,
  last_error text,
  last_result jsonb
);

ALTER TABLE public.crm_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_sync_state FROM anon, authenticated;

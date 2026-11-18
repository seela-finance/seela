-- Infos Lemlist enregistrées à l'arrivée d'un lead (champs vides seulement, jamais d'écrasement d'une saisie) :
-- société (secteur Lemlist, localisation, description, LinkedIn), contact (accroche LinkedIn, localisation,
-- identifiant du contact Lemlist). Non lisibles par les clients (droits par colonne). Ajouts seulement. Rejouable.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS lemlist_industry text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS linkedin_url text;

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS lemlist_contact_id text;

CREATE INDEX IF NOT EXISTS contacts_lemlist_contact_id_idx ON public.contacts (lemlist_contact_id) WHERE lemlist_contact_id IS NOT NULL;

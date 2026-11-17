-- Infos renvoyées par FullEnrich avec un téléphone (sans coût supplémentaire) : type et statut de la ligne,
-- date de prise de poste du contact, effectif exact et type de la société. Ajouts seulement, non lisibles par les
-- clients (droits par colonne). Rejouable.

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone_line_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone_line_status text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS job_started_at date;

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS headcount integer;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_type text;

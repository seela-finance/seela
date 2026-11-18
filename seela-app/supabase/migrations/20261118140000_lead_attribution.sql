-- Attribution des leads (lib/attribution.ts) : première source connue de la société (liens utm_*, site référent,
-- accès direct), copiée depuis le cookie du visiteur à l'inscription ou au formulaire expert. Jamais écrasée ensuite.
-- Réservée à l'équipe : non lisible par le client (les colonnes de companies sont accordées une à une). Rejouable.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS attribution jsonb;
-- Canal lisible (« Google (naturel) », « Lemlist · chr-novembre », « Accès direct ») pour filtrer et compter
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS attribution_channel text;

CREATE INDEX IF NOT EXISTS companies_attribution_channel_idx
  ON public.companies (attribution_channel) WHERE attribution_channel IS NOT NULL;

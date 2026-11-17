-- Analyse crédit automatique de chaque dossier soumis (agent « analyste crédit », lib/credit-analyst.ts).
-- Une ligne par analyse : la plus récente fait foi, les précédentes restent consultables.
-- Document interne à l'équipe : aucun accès client (service role uniquement). Rejouable.

CREATE TABLE IF NOT EXISTS public.credit_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.financing_requests(id) ON DELETE CASCADE,
  -- favorable | favorable_sous_reserve | defavorable | a_completer
  avis text NOT NULL,
  -- Réponse du modèle (synthèse, points forts, vigilance, questions, pièces, placement)
  analysis jsonb NOT NULL,
  -- Indicateurs calculés par le code (ratios, alertes) donnés au modèle et affichés dans la fiche
  indicators jsonb NOT NULL,
  model text NOT NULL,
  -- submission (à la soumission) | admin (relance depuis la fiche) | recap (rattrapage du récapitulatif)
  triggered_by text NOT NULL DEFAULT 'submission',
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_analyses_request_idx ON public.credit_analyses (request_id, created_at DESC);

DO $$
BEGIN
  ALTER TABLE public.credit_analyses ADD CONSTRAINT credit_analyses_avis_check
    CHECK (avis IN ('favorable', 'favorable_sous_reserve', 'defavorable', 'a_completer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.credit_analyses ADD CONSTRAINT credit_analyses_triggered_by_check
    CHECK (triggered_by IN ('submission', 'admin', 'recap'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.credit_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.credit_analyses FROM anon, authenticated;

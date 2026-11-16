-- #34 : offre manuelle et contre-offre.
-- Une offre peut maintenant venir du back-office (leaser hors grille ou nom libre) : elle porte
-- ses propres conditions au lieu de les lire sur la fiche du leaser. Une contre-offre garde
-- les conditions d'avant pour que le client voie l'ancien loyer barré.
-- Rejouable : chaque instruction vérifie l'état avant d'agir.
-- Les offres existantes prennent source = 'matching' ; aucune donnée n'est modifiée.

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'matching';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS previous_terms jsonb;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS conditions text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS client_message text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS periodicite text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS frais_dossier numeric;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS depot_garantie numeric;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  ALTER TABLE public.offers ADD CONSTRAINT offers_source_check
    CHECK (source IN ('matching', 'manual', 'counter_offer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.offers ADD CONSTRAINT offers_periodicite_check
    CHECK (periodicite IS NULL OR periodicite IN ('mensuelle', 'trimestrielle', 'annuelle'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOT VALID : contrôle les nouvelles écritures sans échouer sur une offre existante à 0 €.
DO $$
BEGIN
  ALTER TABLE public.offers ADD CONSTRAINT offers_amounts_check
    CHECK ((monthly_payment IS NULL OR monthly_payment > 0)
       AND (frais_dossier IS NULL OR frais_dossier >= 0)
       AND (depot_garantie IS NULL OR depot_garantie >= 0)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Le client lit ses offres (policy existante) mais n'écrit toujours rien : les grants
-- de 20261102180000_protect_client_writes.sql couvrent aussi les nouvelles colonnes.

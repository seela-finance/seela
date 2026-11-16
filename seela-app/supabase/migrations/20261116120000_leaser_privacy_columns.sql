-- Anonymat des financeurs, étape 1 sur 2 (ajouts seulement, sans effet sur le code en place).
-- Le client ne voit qu'un nom public par offre, « Financeur A · Banque » : jamais le nom du leaser.
-- À appliquer AVANT le déploiement du code ; l'étape 2 (20261116120100) APRÈS.
-- Rejouable.

ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS public_kind text NOT NULL DEFAULT 'Établissement financier';

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS leaser_id uuid REFERENCES public.leasers(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS public_name text;
CREATE INDEX IF NOT EXISTS offers_leaser_id_idx ON public.offers (leaser_id);

-- Lettre de la n-ième offre d'un dossier (0 → A) ; au-delà de Z, un numéro.
CREATE OR REPLACE FUNCTION public.offer_letter(n integer) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN n < 26 THEN chr(65 + n) ELSE (n + 1)::text END
$$;

-- Toute nouvelle offre (matching, offre manuelle, tests) reçoit son leaser_id et son nom public,
-- quel que soit le code qui l'écrit. La lettre suit l'ordre d'arrivée des offres du dossier.
CREATE OR REPLACE FUNCTION public.offers_set_public_name() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing integer;
  kind text;
BEGIN
  IF NEW.leaser_id IS NULL AND NEW.leaser_name IS NOT NULL THEN
    SELECT id INTO NEW.leaser_id FROM public.leasers WHERE name = NEW.leaser_name ORDER BY created_at LIMIT 1;
  END IF;
  IF NEW.public_name IS NULL THEN
    SELECT count(*) INTO existing FROM public.offers WHERE request_id = NEW.request_id;
    SELECT public_kind INTO kind FROM public.leasers WHERE id = NEW.leaser_id;
    NEW.public_name := 'Financeur ' || public.offer_letter(existing) || ' · ' || coalesce(kind, 'Établissement financier');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS offers_set_public_name ON public.offers;
CREATE TRIGGER offers_set_public_name BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_set_public_name();

-- Offres existantes : leaser retrouvé par son nom, lettre selon l'ordre de création dans le dossier.
UPDATE public.offers o SET leaser_id = l.id
FROM public.leasers l
WHERE o.leaser_id IS NULL AND l.name = o.leaser_name;

WITH ranked AS (
  SELECT o.id, row_number() OVER (PARTITION BY o.request_id ORDER BY o.created_at, o.id) - 1 AS n, l.public_kind
  FROM public.offers o LEFT JOIN public.leasers l ON l.id = o.leaser_id
)
UPDATE public.offers o
SET public_name = 'Financeur ' || public.offer_letter(r.n::integer) || ' · ' || coalesce(r.public_kind, 'Établissement financier')
FROM ranked r
WHERE o.id = r.id AND o.public_name IS NULL;

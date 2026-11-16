-- Lot Grenke, PR B : barème par tranche de montant × durée, conditions du leaser, éligibilité par
-- famille et type de matériel, frais client et majoration par leaser ; seed Grenke.
-- Les leasers fictifs (BNP Lease, Société Générale Équipement, Crédit Agricole Leasing) sont désactivés.
-- Familles et types : lib/equipment.ts (slugs stables). Écritures : service role uniquement (back-office).
-- Rejouable.

-- ── Conditions du leaser ─────────────────────────────────────────────
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS residual_value_pct numeric;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS purchase_option text;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS rent_timing text;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS deposit_terms text;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS insurance_required boolean;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS insurance_cost text;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS commission_included_pct numeric;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS commission_max_pct numeric;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS rates_valid_until date;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS supplier_conditions text;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS internal_notes text;
-- Par leaser : majoration du coefficient affiché au client, et barème des frais de dossier client everlease
-- client_fee_rules : {"tiers": [{"up_to": 50000, "fixed": 1000}, {"up_to": null, "rate": 0.025}], "min": 490, "max": 2500}
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS markup_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE public.leasers ADD COLUMN IF NOT EXISTS client_fee_rules jsonb;

DO $$
BEGIN
  ALTER TABLE public.leasers ADD CONSTRAINT leasers_rent_timing_check CHECK (rent_timing IS NULL OR rent_timing IN ('echoir', 'echu'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.leasers ADD CONSTRAINT leasers_pct_check CHECK (
    (residual_value_pct IS NULL OR residual_value_pct BETWEEN 0 AND 100)
    AND (commission_included_pct IS NULL OR commission_included_pct BETWEEN 0 AND 20)
    AND (commission_max_pct IS NULL OR commission_max_pct BETWEEN 0 AND 20)
    AND markup_pct BETWEEN 0 AND 20);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Barème : coefficient mensuel en % du montant financé HT ──────────
CREATE TABLE IF NOT EXISTS public.leaser_rate_grid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id uuid NOT NULL REFERENCES public.leasers(id) ON DELETE CASCADE,
  amount_min numeric NOT NULL DEFAULT 0,
  amount_max numeric,
  duration_months integer NOT NULL,
  coefficient_pct numeric NOT NULL,
  equipment_family text,
  financing_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leaser_rate_grid_values_check CHECK (
    amount_min >= 0 AND (amount_max IS NULL OR amount_max > amount_min)
    AND duration_months BETWEEN 6 AND 120
    AND coefficient_pct > 0 AND coefficient_pct < 20),
  CONSTRAINT leaser_rate_grid_financing_check CHECK (financing_type IS NULL OR financing_type IN ('leasing', 'lease_back', 'credit_bail'))
);
CREATE UNIQUE INDEX IF NOT EXISTS leaser_rate_grid_cell_idx ON public.leaser_rate_grid
  (leaser_id, amount_min, duration_months, coalesce(equipment_family, ''), coalesce(financing_type, ''));

-- ── Éligibilité par famille (type null) ou par type de matériel ──────
CREATE TABLE IF NOT EXISTS public.leaser_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id uuid NOT NULL REFERENCES public.leasers(id) ON DELETE CASCADE,
  equipment_family text NOT NULL,
  equipment_type text,
  status text NOT NULL,
  conditions text,
  CONSTRAINT leaser_eligibility_status_check CHECK (status IN ('yes', 'no', 'conditional'))
);
CREATE UNIQUE INDEX IF NOT EXISTS leaser_eligibility_cell_idx ON public.leaser_eligibility
  (leaser_id, equipment_family, coalesce(equipment_type, ''));

-- Lignes de devis : famille et type (l'analyse IA les renseigne ; l'ancienne `category` reste)
ALTER TABLE public.line_items ADD COLUMN IF NOT EXISTS equipment_family text;
ALTER TABLE public.line_items ADD COLUMN IF NOT EXISTS equipment_type text;
UPDATE public.line_items SET equipment_family = CASE category
  WHEN 'Informatique' THEN 'informatique' WHEN 'Téléphonie' THEN 'telephonie' WHEN 'Audiovisuel' THEN 'audiovisuel'
  WHEN 'Mobilier' THEN 'mobilier' WHEN 'Médical' THEN 'medical' WHEN 'Industrie' THEN 'industrie' WHEN 'Véhicule' THEN 'vehicules'
  END
WHERE equipment_family IS NULL AND category IS NOT NULL;

-- Aucun accès client ni visiteur : le back-office et le matching passent par le service role
ALTER TABLE public.leaser_rate_grid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaser_eligibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.leaser_rate_grid, public.leaser_eligibility FROM anon, authenticated;

-- ── Taux existants repris dans le barème (une tranche unique, de 0 € sans plafond) ──
INSERT INTO public.leaser_rate_grid (leaser_id, amount_min, amount_max, duration_months, coefficient_pct, equipment_family, financing_type)
SELECT r.leaser_id, 0, NULL, r.duration_months, round(r.coefficient * 100, 4),
  CASE r.equipment_category
    WHEN 'Informatique' THEN 'informatique' WHEN 'Téléphonie' THEN 'telephonie' WHEN 'Audiovisuel' THEN 'audiovisuel'
    WHEN 'Mobilier' THEN 'mobilier' WHEN 'Médical' THEN 'medical' WHEN 'Industrie' THEN 'industrie' WHEN 'Véhicule' THEN 'vehicules'
  END,
  r.financing_type
FROM public.leaser_rates r
WHERE r.leaser_id IS NOT NULL AND r.coefficient > 0 AND r.coefficient < 0.2
ON CONFLICT DO NOTHING;

-- ── Leasers fictifs désactivés ; leurs offres passées restent ─────────
UPDATE public.leasers SET is_active = false, public_kind = 'Banque'
WHERE name IN ('BNP Lease', 'Société Générale Équipement', 'Crédit Agricole Leasing') AND test_user_id IS NULL;

-- ── Grenke ───────────────────────────────────────────────────────────
-- Inconnu à ce jour = NULL (affiché « À compléter » dans le back-office) : frais de dossier, option d'achat,
-- loyers à échoir ou échus, dépôt, assurance, validité du barème, délai, périodicités, référent.
INSERT INTO public.leasers (name, slug, public_kind, is_active, min_amount, max_amount,
  depot_garantie, frais_dossier, penalite_resiliation, delai_reponse_heures, periodicite, periodicites,
  anciennete_min_mois, score_seela_min, commission_included_pct, markup_pct, client_fee_rules, supplier_conditions, internal_notes, referent_name)
SELECT 'Grenke', 'grenke', 'Banque', true, 500, 350000,
  NULL, NULL, NULL, NULL, 'mensuelle', NULL,
  0, 0, 2, 0,
  '{"tiers": [{"up_to": null, "rate": 0.015}], "min": 490, "max": 2500}'::jsonb,
  'Fournisseurs en France et dans l''UE, facturation en euros uniquement. Paiement direct au fournisseur à réception du matériel, acompte de 30 % maximum.',
  'Barème « attitré » everlease, commission everlease de 2 % incluse (mail de Florent Loisel, mi-novembre 2026). Pas de crédit-bail. Ancienneté minimale à confirmer (0 provisoire).',
  'Florent Loisel'
WHERE NOT EXISTS (SELECT 1 FROM public.leasers WHERE slug = 'grenke');

INSERT INTO public.leaser_financing_types (leaser_id, financing_type)
SELECT l.id, t.financing_type FROM public.leasers l, (VALUES ('leasing'), ('lease_back')) AS t(financing_type)
WHERE l.slug = 'grenke'
  AND NOT EXISTS (SELECT 1 FROM public.leaser_financing_types f WHERE f.leaser_id = l.id AND f.financing_type = t.financing_type);

INSERT INTO public.leaser_rate_grid (leaser_id, amount_min, amount_max, duration_months, coefficient_pct)
SELECT l.id, g.amount_min, g.amount_max, g.duration_months, g.coefficient_pct
FROM public.leasers l, (VALUES
  (500, 2500, 18, 6.20),
  (2500.01, 5000, 18, 6.18),
  (5000.01, 12500, 18, 6.16),
  (12500.01, 25000, 18, 6.14),
  (25000.01, 37500, 18, 6.13),
  (37500.01, 50000, 18, 6.12),
  (50000.01, 350000, 18, 6.09),
  (500, 2500, 24, 4.79),
  (2500.01, 5000, 24, 4.74),
  (5000.01, 12500, 24, 4.74),
  (12500.01, 25000, 24, 4.73),
  (25000.01, 37500, 24, 4.72),
  (37500.01, 50000, 24, 4.71),
  (50000.01, 350000, 24, 4.69),
  (500, 2500, 30, 3.85),
  (2500.01, 5000, 30, 3.83),
  (5000.01, 12500, 30, 3.81),
  (12500.01, 25000, 30, 3.79),
  (25000.01, 37500, 30, 3.78),
  (37500.01, 50000, 30, 3.77),
  (50000.01, 350000, 30, 3.74),
  (500, 2500, 36, 3.28),
  (2500.01, 5000, 36, 3.24),
  (5000.01, 12500, 36, 3.24),
  (12500.01, 25000, 36, 3.23),
  (25000.01, 37500, 36, 3.21),
  (37500.01, 50000, 36, 3.19),
  (50000.01, 350000, 36, 3.17),
  (500, 2500, 42, 2.92),
  (2500.01, 5000, 42, 2.90),
  (5000.01, 12500, 42, 2.88),
  (12500.01, 25000, 42, 2.87),
  (25000.01, 37500, 42, 2.85),
  (37500.01, 50000, 42, 2.84),
  (50000.01, 350000, 42, 2.82),
  (500, 2500, 48, 2.57),
  (2500.01, 5000, 48, 2.56),
  (5000.01, 12500, 48, 2.55),
  (12500.01, 25000, 48, 2.53),
  (25000.01, 37500, 48, 2.52),
  (37500.01, 50000, 48, 2.51),
  (50000.01, 350000, 48, 2.49),
  (500, 2500, 54, 2.35),
  (2500.01, 5000, 54, 2.30),
  (5000.01, 12500, 54, 2.27),
  (12500.01, 25000, 54, 2.26),
  (25000.01, 37500, 54, 2.24),
  (37500.01, 50000, 54, 2.23),
  (50000.01, 350000, 54, 2.21),
  (500, 2500, 60, 2.13),
  (2500.01, 5000, 60, 2.11),
  (5000.01, 12500, 60, 2.09),
  (12500.01, 25000, 60, 2.07),
  (25000.01, 37500, 60, 2.06),
  (37500.01, 50000, 60, 2.05),
  (50000.01, 350000, 60, 2.02),
  (500, 2500, 63, 2.02),
  (2500.01, 5000, 63, 2.00),
  (5000.01, 12500, 63, 1.98),
  (12500.01, 25000, 63, 1.96),
  (25000.01, 37500, 63, 1.95),
  (37500.01, 50000, 63, 1.94),
  (50000.01, 350000, 63, 1.93)
) AS g(amount_min, amount_max, duration_months, coefficient_pct)
WHERE l.slug = 'grenke'
ON CONFLICT DO NOTHING;

INSERT INTO public.leaser_eligibility (leaser_id, equipment_family, equipment_type, status, conditions)
SELECT l.id, e.equipment_family, e.equipment_type, e.status, e.conditions
FROM public.leasers l, (VALUES
  ('informatique', NULL, 'yes', NULL),
  ('telephonie', NULL, 'yes', NULL),
  ('audiovisuel', NULL, 'yes', NULL),
  ('mobilier', NULL, 'yes', NULL),
  ('medical', NULL, 'yes', NULL),
  ('chr', NULL, 'yes', NULL),
  ('industrie', NULL, 'yes', NULL),
  ('manutention', NULL, 'yes', NULL),
  ('btp', NULL, 'yes', NULL),
  ('securite', NULL, 'yes', NULL),
  ('sport', NULL, 'yes', NULL),
  ('vehicules', NULL, 'no', 'Véhicules immatriculés exclus (échange du 09/11/2026)'),
  ('informatique', 'logiciels-licences', 'conditional', 'À valider au cas par cas : part immatérielle'),
  ('audiovisuel', 'affichage-ecrans', 'conditional', 'À valider au cas par cas'),
  ('audiovisuel', 'post-production', 'conditional', 'À valider au cas par cas')
) AS e(equipment_family, equipment_type, status, conditions)
WHERE l.slug = 'grenke'
ON CONFLICT DO NOTHING;

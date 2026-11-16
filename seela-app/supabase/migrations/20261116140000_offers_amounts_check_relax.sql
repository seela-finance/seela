-- Correctif de 20261112120000_manual_offers.sql : la contrainte `offers_amounts_check` exigeait un loyer > 0.
-- Ajoutée NOT VALID, elle ne protégeait les offres existantes que tant qu'on ne les modifiait pas : la reprise
-- des noms publics (20261116120000) ou un simple changement de statut échouait sur une ancienne offre à 0 €.
-- On refuse désormais seulement les montants négatifs ; l'offre manuelle exige déjà un loyer > 0 (lib/admin-offers.ts).
-- À appliquer AVANT 20261116120000_leaser_privacy_columns.sql en prod. Rejouable.

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_amounts_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_amounts_check
  CHECK ((monthly_payment IS NULL OR monthly_payment >= 0)
     AND (frais_dossier IS NULL OR frais_dossier >= 0)
     AND (depot_garantie IS NULL OR depot_garantie >= 0));

-- ─── Schema ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leasers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#1A1A18',
  is_active BOOLEAN DEFAULT TRUE,
  referent_name TEXT,
  referent_email TEXT,
  referent_phone TEXT,
  min_amount NUMERIC DEFAULT 1000,
  max_amount NUMERIC DEFAULT 500000,
  depot_garantie NUMERIC DEFAULT 0,
  frais_dossier NUMERIC DEFAULT 0,
  penalite_resiliation TEXT DEFAULT 'Capital restant dû + 3%',
  delai_reponse_heures INTEGER DEFAULT 48,
  periodicite TEXT DEFAULT 'mensuelle',
  anciennete_min_mois INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaser_equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id UUID REFERENCES leasers(id) ON DELETE CASCADE,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leaser_financing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id UUID REFERENCES leasers(id) ON DELETE CASCADE,
  financing_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leaser_excluded_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id UUID REFERENCES leasers(id) ON DELETE CASCADE,
  sector_naf TEXT
);

CREATE TABLE IF NOT EXISTS leaser_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id UUID REFERENCES leasers(id) ON DELETE CASCADE,
  duration_months INTEGER NOT NULL,
  equipment_category TEXT,
  financing_type TEXT DEFAULT 'leasing',
  coefficient NUMERIC NOT NULL,
  taux_nominal NUMERIC,
  vr_amount NUMERIC DEFAULT 1,
  option_achat_amount NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaser_advantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaser_id UUID REFERENCES leasers(id) ON DELETE CASCADE,
  advantage TEXT
);

-- Colonnes supplémentaires sur offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rate NUMERIC;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS notes TEXT;

-- RLS : tables leasers en lecture publique (pas de données sensibles)
ALTER TABLE leasers DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_equipment_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_financing_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_excluded_sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_advantages DISABLE ROW LEVEL SECURITY;

-- ─── Seed : BNP Lease ─────────────────────────────────────────────────────────

WITH ins AS (
  INSERT INTO leasers (name, slug, brand_color, referent_email, delai_reponse_heures,
    min_amount, max_amount, anciennete_min_mois, depot_garantie, frais_dossier,
    penalite_resiliation, periodicite,
    description, referent_name)
  VALUES (
    'BNP Lease', 'bnp-lease', '#006FAF', 'partenaires@bnplease.fr', 24,
    3000, 300000, 24, 0, 0,
    'Capital restant dû × 3% (réduit à 1.5% après 24 mois)', 'Mensuelle, par prélèvement SEPA',
    'Leader français du crédit-bail mobilier, présent dans 15 pays européens.',
    'Équipe Partenaires BNP Lease'
  )
  RETURNING id
)
INSERT INTO leaser_equipment_categories (leaser_id, category)
SELECT id, unnest(ARRAY['Informatique','Mobilier','Téléphonie','Audiovisuel']) FROM ins;

WITH l AS (SELECT id FROM leasers WHERE slug = 'bnp-lease')
INSERT INTO leaser_financing_types (leaser_id, financing_type)
SELECT id, unnest(ARRAY['leasing','credit_bail']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'bnp-lease')
INSERT INTO leaser_advantages (leaser_id, advantage)
SELECT id, unnest(ARRAY['Décision en 24h', 'Option d''achat 1€', 'Premier loyer offert']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'bnp-lease')
INSERT INTO leaser_rates (leaser_id, duration_months, coefficient, taux_nominal, option_achat_amount)
SELECT id, dur, coef, taux, 1 FROM l,
  (VALUES (24, 0.0475, 4.65), (36, 0.0338, 4.85), (48, 0.0268, 5.05), (60, 0.0228, 5.25))
  AS t(dur, coef, taux);

-- ─── Seed : Société Générale Équipement ──────────────────────────────────────

WITH ins AS (
  INSERT INTO leasers (name, slug, brand_color, referent_email, delai_reponse_heures,
    min_amount, max_amount, anciennete_min_mois, depot_garantie, frais_dossier,
    penalite_resiliation, periodicite,
    description, referent_name)
  VALUES (
    'Société Générale Équipement', 'sg-equipement', '#E60028', 'leasing@sgequipement.fr', 48,
    5000, 500000, 12, 0, 150,
    'Capital restant dû + 3%', 'Mensuelle, par prélèvement SEPA',
    'Filiale spécialisée de Société Générale dédiée au financement des équipements professionnels.',
    'Équipe Leasing SG Équipement'
  )
  RETURNING id
)
INSERT INTO leaser_equipment_categories (leaser_id, category)
SELECT id, unnest(ARRAY['Informatique','Mobilier','Véhicule','Industrie','Médical']) FROM ins;

WITH l AS (SELECT id FROM leasers WHERE slug = 'sg-equipement')
INSERT INTO leaser_financing_types (leaser_id, financing_type)
SELECT id, unnest(ARRAY['leasing','lld','credit_bail']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'sg-equipement')
INSERT INTO leaser_advantages (leaser_id, advantage)
SELECT id, unnest(ARRAY['Loyer dégressif possible', 'Garantie panne incluse', 'Réponse sous 48h']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'sg-equipement')
INSERT INTO leaser_rates (leaser_id, duration_months, coefficient, taux_nominal, option_achat_amount)
SELECT id, dur, coef, taux, 1 FROM l,
  (VALUES (24, 0.0482, 4.75), (36, 0.0342, 4.92), (48, 0.0272, 5.12), (60, 0.0232, 5.35))
  AS t(dur, coef, taux);

-- ─── Seed : Crédit Agricole Leasing ──────────────────────────────────────────

WITH ins AS (
  INSERT INTO leasers (name, slug, brand_color, referent_email, delai_reponse_heures,
    min_amount, max_amount, anciennete_min_mois, depot_garantie, frais_dossier,
    penalite_resiliation, periodicite,
    description, referent_name)
  VALUES (
    'Crédit Agricole Leasing', 'ca-leasing', '#00A651', 'leasing@credit-agricole.fr', 48,
    2000, 200000, 0, 0, 0,
    'Capital restant dû + 3%', 'Mensuelle, par prélèvement SEPA',
    'Solution de financement locatif accessible, même pour les entreprises en création.',
    'Équipe Leasing Crédit Agricole'
  )
  RETURNING id
)
INSERT INTO leaser_equipment_categories (leaser_id, category)
SELECT id, unnest(ARRAY['Informatique','Mobilier','Téléphonie','Médical','Audiovisuel','Autre']) FROM ins;

WITH l AS (SELECT id FROM leasers WHERE slug = 'ca-leasing')
INSERT INTO leaser_financing_types (leaser_id, financing_type)
SELECT id, unnest(ARRAY['leasing','credit_bail','lease_back']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'ca-leasing')
INSERT INTO leaser_advantages (leaser_id, advantage)
SELECT id, unnest(ARRAY['Accepte les jeunes entreprises', 'Assistance dédiée', 'Renouvellement à mi-parcours']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'ca-leasing')
INSERT INTO leaser_rates (leaser_id, duration_months, coefficient, taux_nominal, option_achat_amount)
SELECT id, dur, coef, taux, 1 FROM l,
  (VALUES (24, 0.0488, 4.95), (36, 0.0348, 5.08), (48, 0.0278, 5.28), (60, 0.0238, 5.45))
  AS t(dur, coef, taux);

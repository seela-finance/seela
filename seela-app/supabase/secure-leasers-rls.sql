-- Remplace fix-rls.sql : la RLS désactivée laissait la clé anon (publique)
-- écrire dans les tables leasers (taux, plafonds, leasers, référents).
-- Ici : RLS activée + lecture seule pour anon/authenticated.
-- Les écritures se font uniquement depuis le SQL editor (ou le service role).

ALTER TABLE leasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_financing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_excluded_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_advantages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leasers_read" ON leasers;
DROP POLICY IF EXISTS "leaser_equipment_categories_read" ON leaser_equipment_categories;
DROP POLICY IF EXISTS "leaser_financing_types_read" ON leaser_financing_types;
DROP POLICY IF EXISTS "leaser_excluded_sectors_read" ON leaser_excluded_sectors;
DROP POLICY IF EXISTS "leaser_rates_read" ON leaser_rates;
DROP POLICY IF EXISTS "leaser_advantages_read" ON leaser_advantages;

CREATE POLICY "leasers_read" ON leasers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaser_equipment_categories_read" ON leaser_equipment_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaser_financing_types_read" ON leaser_financing_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaser_excluded_sectors_read" ON leaser_excluded_sectors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaser_rates_read" ON leaser_rates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaser_advantages_read" ON leaser_advantages FOR SELECT TO anon, authenticated USING (true);

-- Vérification : chaque table doit avoir rowsecurity = true et une seule policy SELECT
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'leaser%' ORDER BY tablename;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename LIKE 'leaser%' ORDER BY tablename;

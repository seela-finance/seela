-- Désactive RLS sur toutes les tables leasers (données non sensibles, lecture publique OK)
ALTER TABLE leasers DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_equipment_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_financing_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_excluded_sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaser_advantages DISABLE ROW LEVEL SECURITY;

-- Vérifie que les 3 leasers sont bien là
SELECT name, is_active, min_amount, max_amount, anciennete_min_mois FROM leasers ORDER BY name;

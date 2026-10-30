-- ─── Leaser de test (prod) ───────────────────────────────────────────────────
-- Un faux leaser réservé à un seul compte : le matching (/api/match-leasers)
-- ne le propose qu'à l'utilisateur dont l'id est dans test_user_id.
-- Les emails « leaser » (transmission, confirmation) partent vers referent_email.
--
-- À exécuter APRÈS le déploiement du filtre test_user_id dans match-leasers :
-- l'ancien code proposerait ce leaser à tous les clients.
--
-- Remplacer les deux adresses ci-dessous avant d'exécuter :
--   ton_compte : l'email de ton compte everlease (auth.users)
--   ta_boite   : la boîte qui reçoit les emails « leaser »

ALTER TABLE leasers ADD COLUMN IF NOT EXISTS test_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

WITH params AS (
  SELECT
    (SELECT id FROM auth.users WHERE email = 'ton_compte@exemple.fr') AS user_id,
    'ta_boite@exemple.fr' AS referent_email
),
ins AS (
  INSERT INTO leasers (name, slug, brand_color, referent_email, referent_name, delai_reponse_heures,
    min_amount, max_amount, anciennete_min_mois, depot_garantie, frais_dossier,
    penalite_resiliation, periodicite, description, test_user_id)
  SELECT
    'Leaser Test', 'leaser-test', '#9A9A93', referent_email, 'Leaser Test (Louis)', 24,
    0, 100000000, 0, 0, 0,
    'Capital restant dû + 3%', 'Mensuelle, par prélèvement SEPA',
    'Leaser fictif pour tester le parcours de bout en bout. Visible uniquement par son compte de test.',
    user_id
  FROM params
  WHERE user_id IS NOT NULL -- rien n'est créé si l'email du compte est faux
  RETURNING id
)
INSERT INTO leaser_equipment_categories (leaser_id, category)
SELECT id, unnest(ARRAY['Informatique','Mobilier','Téléphonie','Audiovisuel','Véhicule','Industrie','Médical','Autre']) FROM ins;

WITH l AS (SELECT id FROM leasers WHERE slug = 'leaser-test')
INSERT INTO leaser_financing_types (leaser_id, financing_type)
SELECT id, unnest(ARRAY['leasing','lld','credit_bail','lease_back']) FROM l;

WITH l AS (SELECT id FROM leasers WHERE slug = 'leaser-test')
INSERT INTO leaser_advantages (leaser_id, advantage)
SELECT id, 'Leaser de test' FROM l;

-- Coefficients légèrement au-dessus des vrais leasers : l'offre test n'est
-- jamais « Recommandée » par défaut, le parcours réel reste lisible.
WITH l AS (SELECT id FROM leasers WHERE slug = 'leaser-test')
INSERT INTO leaser_rates (leaser_id, duration_months, coefficient, taux_nominal, option_achat_amount)
SELECT id, dur, coef, taux, 1 FROM l,
  (VALUES (24, 0.0495, 5.50), (36, 0.0355, 5.60), (48, 0.0285, 5.70), (60, 0.0245, 5.80))
  AS t(dur, coef, taux);

-- Vérification : une ligne, test_user_id rempli, 8 catégories, 4 types, 4 taux
SELECT l.name, l.test_user_id, l.referent_email,
  (SELECT count(*) FROM leaser_equipment_categories c WHERE c.leaser_id = l.id) AS categories,
  (SELECT count(*) FROM leaser_financing_types t WHERE t.leaser_id = l.id) AS types,
  (SELECT count(*) FROM leaser_rates r WHERE r.leaser_id = l.id) AS taux
FROM leasers l WHERE l.slug = 'leaser-test';

-- Pour le supprimer (cascade sur catégories, types, avantages, taux) :
-- DELETE FROM leasers WHERE slug = 'leaser-test';

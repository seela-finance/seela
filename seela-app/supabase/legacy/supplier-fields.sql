-- Amélioration 1 : champs fournisseur + référence document
ALTER TABLE financing_requests ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE financing_requests ADD COLUMN IF NOT EXISTS supplier_address TEXT;
ALTER TABLE financing_requests ADD COLUMN IF NOT EXISTS supplier_siren TEXT;
ALTER TABLE financing_requests ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE financing_requests ADD COLUMN IF NOT EXISTS document_date DATE;

-- Amélioration 3 : périodicité
ALTER TABLE financing_requests ADD COLUMN IF NOT EXISTS periodicite TEXT DEFAULT 'mensuelle';
ALTER TABLE leasers ADD COLUMN IF NOT EXISTS periodicites TEXT[] DEFAULT ARRAY['mensuelle'];

-- Toutes les périodicités pour les 3 leasers existants
UPDATE leasers SET periodicites = ARRAY['mensuelle','trimestrielle','annuelle'] WHERE name IN ('BNP Lease','Société Générale Équipement','Crédit Agricole Leasing');

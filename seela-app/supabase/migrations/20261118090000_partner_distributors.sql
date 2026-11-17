-- Parcours distributeur (docs/parcours-distributeur.md) : un distributeur partenaire monte le dossier de
-- son client, le client le confirme depuis un lien reçu par email, le distributeur suit ses dossiers.
-- Ajout seul, rien n'est retiré : le code fonctionne avant comme après. Rejouable.

-- ─── Partenaire : activé par l'équipe depuis la fiche société du CRM ────────
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS partner_enabled boolean NOT NULL DEFAULT false;
-- Le compte lit ce drapeau pour sa seule société (RLS companies_read_own) : il affiche l'espace partenaire
GRANT SELECT (partner_enabled) ON public.companies TO authenticated;

-- ─── Dossier apporté par un partenaire ──────────────────────────────────────
-- Sans clé étrangère, volontairement : une seconde relation vers companies / contacts rendrait ambiguës
-- les jointures existantes (`companies(...)`, `contacts(...)` depuis un dossier). Écrites par le serveur seul.
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS partner_company_id uuid;
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS partner_contact_id uuid;
-- Le client a rejoint le dossier depuis son invitation : lui seul confirme ensuite l'offre
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS client_joined_at timestamptz;
-- Démarrage du contrat (saisi par l'équipe au passage en « actif ») : date de fin = début + durée
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS contract_start_date date;

CREATE INDEX IF NOT EXISTS financing_requests_partner_company_idx
  ON public.financing_requests (partner_company_id) WHERE partner_company_id IS NOT NULL;

-- Le navigateur crée un brouillon sans aucun de ces champs : seul le serveur (service role) les écrit
DROP POLICY IF EXISTS requests_insert_no_partner ON public.financing_requests;
CREATE POLICY requests_insert_no_partner ON public.financing_requests AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (partner_company_id IS NULL AND partner_contact_id IS NULL AND client_joined_at IS NULL AND contract_start_date IS NULL);

-- ─── Invitation du client ───────────────────────────────────────────────────
-- Seul le hash du jeton est stocké ; le lien n'est valable que pour l'email indiqué par le partenaire.
CREATE TABLE IF NOT EXISTS public.request_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.financing_requests(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL,
  created_by uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS request_invitations_token_hash_key ON public.request_invitations (token_hash);
CREATE INDEX IF NOT EXISTS request_invitations_request_id_idx ON public.request_invitations (request_id);

-- Serveur uniquement : aucune lecture ni écriture depuis le navigateur
ALTER TABLE public.request_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_invitations FROM anon, authenticated;

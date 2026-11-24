-- Demandes du client sur son contrat (docs/contrat-client.md) : report d'échéance, rachat anticipé,
-- ajout ou remplacement de matériel, question administrative. Traitées à la main par l'équipe
-- (alerte email, réponse depuis la fiche dossier). Ajout seul, rejouable.

CREATE TABLE IF NOT EXISTS public.contract_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.financing_requests(id) ON DELETE CASCADE,
  -- Société du dossier au moment de la demande (lecture par le client et le partenaire)
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'recue',
  -- Message du client
  message text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Réponse de l'équipe, vue par le client
  answer text,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.contract_requests ADD CONSTRAINT contract_requests_kind_check
    CHECK (kind IN ('report_echeance', 'rachat_anticipe', 'materiel', 'administratif'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.contract_requests ADD CONSTRAINT contract_requests_status_check
    CHECK (status IN ('recue', 'en_cours', 'repondue', 'close'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS contract_requests_request_id_idx ON public.contract_requests (request_id);
CREATE INDEX IF NOT EXISTS contract_requests_status_idx ON public.contract_requests (status);

-- Le client lit les demandes de ses dossiers ; toute écriture passe par le serveur
ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_requests FROM anon, authenticated;
GRANT SELECT ON public.contract_requests TO authenticated;
DROP POLICY IF EXISTS contract_requests_read_own ON public.contract_requests;
CREATE POLICY contract_requests_read_own ON public.contract_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.financing_requests r
      WHERE r.id = contract_requests.request_id
        AND (r.user_id = auth.uid() OR (r.company_id IS NOT NULL AND r.company_id = public.current_company_id()))
    )
  );

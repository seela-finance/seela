-- Pièces du dossier (docs/pieces-et-compte.md) : Kbis, liasses, situation intermédiaire, statuts, prévisionnel
-- avant transmission au financeur ; pièce d'identité et RIB après son accord. Déposées par le client dans le
-- bucket privé `documents` (sous son dossier), contrôlées par l'équipe. Ajout seul, rejouable.

CREATE TABLE IF NOT EXISTS public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.financing_requests(id) ON DELETE SET NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'en_verification',
  -- Chemin dans le bucket `documents` ; null pour une dispense (aucun fichier)
  path text,
  file_name text,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  -- Motif de refus (vu par le client) ou de dispense (interne)
  review_note text,
  -- Pièces sensibles effacées après la décision du financeur : fichier retiré, ligne conservée pour l'historique
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.company_documents ADD CONSTRAINT company_documents_kind_check
    CHECK (kind IN ('kbis', 'liasse', 'situation', 'statuts', 'previsionnel', 'identite', 'rib'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.company_documents ADD CONSTRAINT company_documents_status_check
    CHECK (status IN ('en_verification', 'validee', 'refusee', 'dispensee'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS company_documents_company_id_idx ON public.company_documents (company_id);

-- Le client lit les pièces de sa société (état, motif de refus) ; toute écriture passe par le serveur
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_documents FROM anon, authenticated;
GRANT SELECT ON public.company_documents TO authenticated;
DROP POLICY IF EXISTS company_documents_read_own ON public.company_documents;
CREATE POLICY company_documents_read_own ON public.company_documents FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

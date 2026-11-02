-- Back-office /admin (#29) : qui est admin, et journal de chaque action admin.
-- Ajouter un admin :
--   INSERT INTO public.admins (user_id, name)
--   SELECT id, 'Prénom' FROM auth.users WHERE email = 'adresse@everlease.fr';

CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- admin_id pointe vers auth.users (pas admins) : le journal survit au retrait d'un admin.
CREATE TABLE public.admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  request_id uuid REFERENCES public.financing_requests(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  leaser_id uuid REFERENCES public.leasers(id) ON DELETE SET NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_events_request_id_idx ON public.admin_events (request_id);
CREATE INDEX admin_events_created_at_idx ON public.admin_events (created_at DESC);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;

-- Chaque compte ne peut lire que sa propre ligne admins (pour savoir s'il est admin) :
-- un client n'y trouve rien. admin_events : aucune policy, service role uniquement.
CREATE POLICY admins_read_own ON public.admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.admins FROM anon;
REVOKE ALL ON public.admin_events FROM anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admins FROM authenticated;

-- Société unique et CRM (docs/crm-modele-donnees.md), étape 1 sur 2 : ajout, sans rien retirer.
-- companies = objet central, contacts = toute personne (remplace profiles), tables crm_* pour le CRM.
-- Tant que le code écrit encore dans profiles, des triggers recopient profiles → companies/contacts
-- et rattachent chaque nouveau dossier à sa société. L'étape 2 supprimera profiles et ces triggers.
-- Fonctionne avant comme après le déploiement du code. Rejouable.

-- ─── Société ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siren text,
  domain text,
  name text NOT NULL,
  legal_form text,
  naf_code text,
  creation_year integer,
  address text,
  country text NOT NULL DEFAULT 'FR',
  revenue_bracket text,
  age_bracket text,
  headcount_bracket text,
  revenue_declared numeric,
  result_declared numeric,
  kyc_completed boolean NOT NULL DEFAULT false,
  financial_docs_uploaded boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  seela_score integer,
  seela_score_grade text,
  seela_score_details jsonb,
  lifecycle_stage text NOT NULL DEFAULT 'prospect',
  sector text,
  asset_types text[],
  source text,
  signal text,
  website text,
  owner_id uuid REFERENCES public.admins(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_siren_key ON public.companies (siren) WHERE siren IS NOT NULL;
CREATE INDEX IF NOT EXISTS companies_domain_idx ON public.companies (lower(domain)) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies (lower(name));

DO $$
BEGIN
  ALTER TABLE public.companies ADD CONSTRAINT companies_lifecycle_stage_check
    CHECK (lifecycle_stage IN ('prospect', 'client', 'partenaire', 'exclu'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Contact ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  job_title text,
  persona text,
  linkedin_url text,
  lemlist_url text,
  owner_id uuid REFERENCES public.admins(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_company_id_idx ON public.contacts (company_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON public.contacts (lower(email)) WHERE email IS NOT NULL;

-- ─── Dossier : société et auteur ─────────────────────────────────────────────

ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.contacts(id);
CREATE INDEX IF NOT EXISTS financing_requests_company_id_idx ON public.financing_requests (company_id);

-- ─── CRM ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  request_id uuid UNIQUE REFERENCES public.financing_requests(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'a_contacter',
  amount numeric,
  next_action text,
  next_action_date date,
  close_date date,
  summary text,
  angle text,
  source_list text,
  signal_type text,
  lemlist_campaign text,
  lost_reason text,
  owner_id uuid REFERENCES public.admins(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_deals_company_id_idx ON public.crm_deals (company_id);
CREATE INDEX IF NOT EXISTS crm_deals_stage_idx ON public.crm_deals (stage);

DO $$
BEGIN
  ALTER TABLE public.crm_deals ADD CONSTRAINT crm_deals_stage_check
    CHECK (stage IN ('a_contacter', 'en_conversation', 'rdv_pris', 'proposition', 'a_recontacter', 'signe', 'perdu'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  call_outcome text,
  title text,
  summary text,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.financing_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_activities_company_id_idx ON public.crm_activities (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_contact_id_idx ON public.crm_activities (contact_id);
CREATE INDEX IF NOT EXISTS crm_activities_deal_id_idx ON public.crm_activities (deal_id);

DO $$
BEGIN
  ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_type_check
    CHECK (type IN ('call', 'email', 'note', 'meeting'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_call_outcome_check
    CHECK (call_outcome IS NULL OR call_outcome IN ('pas_de_reponse', 'messagerie', 'pas_interesse', 'a_rappeler', 'interesse', 'rdv_pris'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.crm_activities ADD CONSTRAINT crm_activities_has_association
    CHECK (num_nonnulls(company_id, contact_id, deal_id, request_id) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.crm_mentions (
  activity_id uuid NOT NULL REFERENCES public.crm_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_at timestamptz,
  PRIMARY KEY (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  due_date date,
  priority text NOT NULL DEFAULT 'normale',
  done_at timestamptz,
  assignee_id uuid REFERENCES public.admins(user_id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.financing_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_tasks_open_idx ON public.crm_tasks (due_date) WHERE done_at IS NULL;

DO $$
BEGIN
  ALTER TABLE public.crm_tasks ADD CONSTRAINT crm_tasks_priority_check
    CHECK (priority IN ('haute', 'normale', 'basse'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Société du compte connecté ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT company_id FROM public.contacts WHERE user_id = auth.uid()
$function$;

REVOKE ALL ON FUNCTION public.current_company_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

-- ─── Recopie profiles → companies / contacts (supprimée à l'étape 2) ─────────

CREATE OR REPLACE FUNCTION public.sync_profile_to_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_contact_id uuid;
  v_company_id uuid;
  v_found_id uuid;
  v_siren text := nullif(trim(new.siren), '');
  v_name text := coalesce(nullif(trim(new.company_name), ''), v_siren);
BEGIN
  SELECT id, company_id INTO v_contact_id, v_company_id FROM public.contacts WHERE user_id = new.id;

  IF v_name IS NOT NULL THEN
    -- Un SIREN déjà connu rattache le contact à la société existante
    -- Un SIREN déjà connu rattache le contact à la société existante, sauf si un autre compte y est
    -- déjà rattaché : le SIREN est public, il ne doit pas suffire à voir les dossiers d'une société.
    -- Le contact reste alors sans société, l'équipe tranche (rattachement manuel).
    IF v_siren IS NOT NULL THEN
      SELECT id INTO v_found_id FROM public.companies WHERE siren = v_siren;
      IF v_found_id IS NOT NULL AND v_found_id IS DISTINCT FROM v_company_id AND EXISTS (
        SELECT 1 FROM public.contacts WHERE company_id = v_found_id AND user_id IS NOT NULL AND user_id <> new.id
      ) THEN
        v_name := NULL;
        v_company_id := NULL;
      ELSE
        v_company_id := coalesce(v_found_id, v_company_id);
      END IF;
    END IF;
  END IF;

  IF v_name IS NOT NULL THEN
    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (siren, name) VALUES (v_siren, v_name) RETURNING id INTO v_company_id;
    END IF;

    UPDATE public.companies SET
      siren = coalesce(v_siren, siren),
      name = v_name,
      legal_form = coalesce(new.legal_form, new.forme_juridique, legal_form),
      naf_code = coalesce(new.naf_code, naf_code),
      creation_year = coalesce(new.date_creation, creation_year),
      address = coalesce(new.supplier_address, address),
      country = coalesce(new.country, country),
      revenue_bracket = coalesce(new.revenue_bracket, revenue_bracket),
      age_bracket = coalesce(new.age_bracket, age_bracket),
      headcount_bracket = coalesce(new.headcount_bracket, headcount_bracket),
      revenue_declared = coalesce(new.revenue_declared, revenue_declared),
      result_declared = coalesce(new.result_declared, result_declared),
      kyc_completed = coalesce(new.kyc_completed, kyc_completed),
      financial_docs_uploaded = coalesce(new.financial_docs_uploaded, financial_docs_uploaded),
      onboarding_completed = coalesce(new.onboarding_completed, onboarding_completed),
      seela_score = coalesce(new.seela_score, seela_score),
      seela_score_grade = coalesce(new.seela_score_grade, seela_score_grade),
      seela_score_details = coalesce(new.seela_score_details, seela_score_details),
      updated_at = now()
    WHERE id = v_company_id;
  END IF;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.contacts (user_id, company_id, first_name, last_name, email, phone, job_title)
    VALUES (new.id, v_company_id, new.first_name, new.last_name, new.email, new.phone, new.role)
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.contacts SET
      company_id = coalesce(v_company_id, company_id),
      first_name = new.first_name,
      last_name = new.last_name,
      email = new.email,
      phone = new.phone,
      job_title = new.role,
      updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  -- Dossiers créés avant que la société soit connue
  IF v_company_id IS NOT NULL THEN
    UPDATE public.financing_requests SET company_id = v_company_id, created_by = coalesce(created_by, v_contact_id)
    WHERE user_id = new.id AND company_id IS NULL;
  END IF;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_sync_company ON public.profiles;
CREATE TRIGGER profiles_sync_company AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_company();

CREATE OR REPLACE FUNCTION public.set_request_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF new.user_id IS NOT NULL AND (new.company_id IS NULL OR new.created_by IS NULL) THEN
    SELECT coalesce(new.company_id, c.company_id), coalesce(new.created_by, c.id)
      INTO new.company_id, new.created_by
      FROM public.contacts c WHERE c.user_id = new.user_id;
  END IF;
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS financing_requests_set_company ON public.financing_requests;
CREATE TRIGGER financing_requests_set_company BEFORE INSERT ON public.financing_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_request_company();

-- Recopie de l'existant (le trigger fait le travail)
UPDATE public.profiles SET id = id;

-- ─── Accès ───────────────────────────────────────────────────────────────────
-- Client : lit sa société, les contacts de sa société et les dossiers de sa société. N'écrit rien
-- directement (inscription et onboarding passeront par le serveur). crm_* : serveur uniquement.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_read_own ON public.companies;
CREATE POLICY companies_read_own ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());

DROP POLICY IF EXISTS contacts_read_own_company ON public.contacts;
CREATE POLICY contacts_read_own_company ON public.contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id = public.current_company_id());

DROP POLICY IF EXISTS requests_read_own_company ON public.financing_requests;
CREATE POLICY requests_read_own_company ON public.financing_requests FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_company_id());

REVOKE ALL ON public.companies, public.contacts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.companies, public.contacts FROM authenticated;
GRANT SELECT ON public.companies, public.contacts TO authenticated;
REVOKE ALL ON public.crm_deals, public.crm_activities, public.crm_mentions, public.crm_tasks FROM anon, authenticated;

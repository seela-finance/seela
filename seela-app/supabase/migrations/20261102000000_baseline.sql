-- Baseline : schéma de la prod Supabase au 2026-11-02, extrait par supabase/export-baseline.sql.
-- Recrée la base de zéro (tables, contraintes, fonctions, trigger auth, RLS, policies, bucket).
-- Inclut le correctif RLS du 2026-11-02 (RLS activée sur profiles, financing_requests,
-- line_items, offers) et handle_new_user qui enregistre l'email.
-- Ne pas modifier : toute évolution = nouvelle migration.

SET check_function_bodies = false;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;

CREATE TABLE public.financing_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  status text DEFAULT 'draft'::text,
  document_url text,
  document_type text,
  duration_months integer,
  notes text,
  total_amount numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  supplier_name text,
  supplier_address text,
  supplier_siren text,
  document_number text,
  document_date date,
  periodicite text DEFAULT 'mensuelle'::text,
  "Qualification_done_?" boolean
);

CREATE TABLE public.leaser_advantages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  leaser_id uuid,
  advantage text
);

CREATE TABLE public.leaser_equipment_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  leaser_id uuid,
  category text NOT NULL
);

CREATE TABLE public.leaser_excluded_sectors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  leaser_id uuid,
  sector_naf text
);

CREATE TABLE public.leaser_financing_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  leaser_id uuid,
  financing_type text NOT NULL
);

CREATE TABLE public.leaser_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  leaser_id uuid,
  duration_months integer NOT NULL,
  equipment_category text,
  financing_type text DEFAULT 'leasing'::text,
  coefficient numeric NOT NULL,
  taux_nominal numeric,
  vr_amount numeric DEFAULT 1,
  option_achat_amount numeric DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leasers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text,
  description text,
  logo_url text,
  brand_color text DEFAULT '#1A1A18'::text,
  is_active boolean DEFAULT true,
  referent_name text,
  referent_email text,
  referent_phone text,
  min_amount numeric DEFAULT 1000,
  max_amount numeric DEFAULT 500000,
  depot_garantie numeric DEFAULT 0,
  frais_dossier numeric DEFAULT 0,
  penalite_resiliation text DEFAULT 'Capital restant dû + 3%'::text,
  delai_reponse_heures integer DEFAULT 48,
  periodicite text DEFAULT 'mensuelle'::text,
  anciennete_min_mois integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  periodicites text[] DEFAULT ARRAY['mensuelle'::text],
  score_seela_min integer DEFAULT 0,
  test_user_id uuid
);

CREATE TABLE public.line_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid,
  description text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  selected boolean DEFAULT true,
  category text
);

CREATE TABLE public.offers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  request_id uuid,
  leaser_name text,
  monthly_payment numeric,
  duration_months integer,
  status text DEFAULT 'indicative'::text,
  selected boolean DEFAULT false,
  rate numeric,
  total_cost numeric,
  notes text,
  confirmed_at timestamp with time zone,
  seela_validated_at timestamp with time zone,
  leaser_confirmed_at timestamp with time zone
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  company_name text,
  siren text,
  revenue_bracket text,
  age_bracket text,
  headcount_bracket text,
  kyc_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  forme_juridique text,
  date_creation integer,
  email text,
  country text DEFAULT 'FR'::text,
  first_name text,
  last_name text,
  phone text,
  role text,
  supplier_address text,
  naf_code text,
  legal_form text,
  revenue_declared numeric,
  result_declared numeric,
  financial_docs_uploaded boolean DEFAULT false,
  seela_score integer,
  seela_score_grade text,
  seela_score_details jsonb,
  onboarding_completed boolean DEFAULT false
);

ALTER TABLE public.financing_requests ADD CONSTRAINT financing_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.leaser_advantages ADD CONSTRAINT leaser_advantages_pkey PRIMARY KEY (id);

ALTER TABLE public.leaser_equipment_categories ADD CONSTRAINT leaser_equipment_categories_pkey PRIMARY KEY (id);

ALTER TABLE public.leaser_excluded_sectors ADD CONSTRAINT leaser_excluded_sectors_pkey PRIMARY KEY (id);

ALTER TABLE public.leaser_financing_types ADD CONSTRAINT leaser_financing_types_pkey PRIMARY KEY (id);

ALTER TABLE public.leaser_rates ADD CONSTRAINT leaser_rates_pkey PRIMARY KEY (id);

ALTER TABLE public.leasers ADD CONSTRAINT leasers_pkey PRIMARY KEY (id);

ALTER TABLE public.leasers ADD CONSTRAINT leasers_slug_key UNIQUE (slug);

ALTER TABLE public.line_items ADD CONSTRAINT line_items_pkey PRIMARY KEY (id);

ALTER TABLE public.offers ADD CONSTRAINT offers_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.financing_requests ADD CONSTRAINT financing_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE public.leaser_advantages ADD CONSTRAINT leaser_advantages_leaser_id_fkey FOREIGN KEY (leaser_id) REFERENCES leasers(id) ON DELETE CASCADE;

ALTER TABLE public.leaser_equipment_categories ADD CONSTRAINT leaser_equipment_categories_leaser_id_fkey FOREIGN KEY (leaser_id) REFERENCES leasers(id) ON DELETE CASCADE;

ALTER TABLE public.leaser_excluded_sectors ADD CONSTRAINT leaser_excluded_sectors_leaser_id_fkey FOREIGN KEY (leaser_id) REFERENCES leasers(id) ON DELETE CASCADE;

ALTER TABLE public.leaser_financing_types ADD CONSTRAINT leaser_financing_types_leaser_id_fkey FOREIGN KEY (leaser_id) REFERENCES leasers(id) ON DELETE CASCADE;

ALTER TABLE public.leaser_rates ADD CONSTRAINT leaser_rates_leaser_id_fkey FOREIGN KEY (leaser_id) REFERENCES leasers(id) ON DELETE CASCADE;

ALTER TABLE public.leasers ADD CONSTRAINT leasers_test_user_id_fkey FOREIGN KEY (test_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.line_items ADD CONSTRAINT line_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES financing_requests(id) ON DELETE CASCADE;

ALTER TABLE public.offers ADD CONSTRAINT offers_request_id_fkey FOREIGN KEY (request_id) REFERENCES financing_requests(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE public.financing_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaser_advantages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaser_equipment_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaser_excluded_sectors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaser_financing_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaser_rates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own requests" ON public.financing_requests AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY leaser_advantages_read ON public.leaser_advantages AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY leaser_equipment_categories_read ON public.leaser_equipment_categories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY leaser_excluded_sectors_read ON public.leaser_excluded_sectors AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY leaser_financing_types_read ON public.leaser_financing_types AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY leaser_rates_read ON public.leaser_rates AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY leasers_read ON public.leasers AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users manage own line items" ON public.line_items AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = ( SELECT financing_requests.user_id
   FROM financing_requests
  WHERE (financing_requests.id = line_items.request_id)))) WITH CHECK ((auth.uid() = ( SELECT financing_requests.user_id
   FROM financing_requests
  WHERE (financing_requests.id = line_items.request_id))));

CREATE POLICY "Users manage own offers" ON public.offers AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = ( SELECT financing_requests.user_id
   FROM financing_requests
  WHERE (financing_requests.id = offers.request_id))));

CREATE POLICY "Users manage own profile" ON public.profiles AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = id));

CREATE POLICY "Allow authenticated deletes" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'documents'::text));

CREATE POLICY "Allow authenticated reads" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'documents'::text));

CREATE POLICY "Allow authenticated uploads" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'documents'::text));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('documents', 'documents', 't', NULL, NULL) ON CONFLICT (id) DO NOTHING;

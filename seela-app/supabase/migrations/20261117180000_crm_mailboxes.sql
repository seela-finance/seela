-- Boîtes mail de l'équipe lues par le CRM (IMAP, lecture seule). Le mot de passe est chiffré par le serveur
-- (EMAIL_ENCRYPTION_KEY) avant d'être stocké : la base ne le voit jamais en clair. Lisible par le serveur seulement.
-- Les emails retenus (échanges avec un contact du CRM) vont dans crm_activities, source 'mailbox'. Rejouable.

CREATE TABLE IF NOT EXISTS public.crm_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.admins(user_id) ON DELETE CASCADE,
  email text NOT NULL,
  imap_host text NOT NULL DEFAULT 'imap.hostinger.com',
  imap_port integer NOT NULL DEFAULT 993,
  password_enc text NOT NULL,
  folders jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  running_since timestamptz,
  last_error text,
  last_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_mailboxes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_mailboxes FROM anon, authenticated;

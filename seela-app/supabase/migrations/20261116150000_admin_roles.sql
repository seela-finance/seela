-- Équipe du back-office : un rôle par membre.
-- admin : tous les droits (dossiers, leasers, équipe). commercial : consulte dossiers et sociétés, ajoute des notes.
-- Les membres existants restent admins. Ajouts et retraits se font depuis /admin/equipe (service role).
-- Rejouable.

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

DO $$
BEGIN
  ALTER TABLE public.admins ADD CONSTRAINT admins_role_check CHECK (role IN ('admin', 'commercial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

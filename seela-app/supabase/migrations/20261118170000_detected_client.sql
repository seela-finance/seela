-- Parcours distributeur : le client final lu par l'IA sur le devis (nom, SIREN, email), pour pré-remplir
-- l'étape « Votre client ». Écrit par le serveur à l'analyse ; le navigateur ne le modifie pas. Rejouable.

ALTER TABLE public.financing_requests ADD COLUMN IF NOT EXISTS detected_client jsonb;

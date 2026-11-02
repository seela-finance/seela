-- Bucket `documents` privé : devis, factures et bilans ne sont plus accessibles par URL publique,
-- et chaque compte ne lit / n'écrit / ne supprime que son propre dossier (`<user_id>/...`).
-- À appliquer APRÈS le déploiement du code qui passe par des liens signés (lib/documents.ts).
-- Les routes admin (service role) ne sont pas concernées par ces policies.

UPDATE storage.buckets SET public = false WHERE id = 'documents';

DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

CREATE POLICY documents_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY documents_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY documents_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

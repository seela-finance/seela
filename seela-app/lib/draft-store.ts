// Écritures du brouillon en service role : le propriétaire est vérifié par lib/draft-workflow.ts.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DetectedClient, DraftMeta, DraftStore, SavedLine } from '@/lib/draft-workflow'
import { RS } from '@/lib/status'

const LINE_COLUMNS = 'id, description, quantity, unit_price, total_price, category, equipment_family, equipment_type, selected'
const META_COLUMNS = 'supplier_name, supplier_address, supplier_siren, document_number, document_date'
const EMPTY_META: DraftMeta = { supplier_name: null, supplier_address: null, supplier_siren: null, document_number: null, document_date: null }

export function supabaseDraftStore(db: SupabaseClient): DraftStore {
  return {
    async loadDraft(requestId) {
      const { data, error } = await db.from('financing_requests').select('id, status, user_id, document_url').eq('id', requestId).maybeSingle()
      if (error) throw new Error(`Brouillon : lecture impossible (${error.message})`)
      return data
    },

    async loadContent(requestId) {
      const [lines, request] = await Promise.all([
        db.from('line_items').select(LINE_COLUMNS).eq('request_id', requestId),
        db.from('financing_requests').select(META_COLUMNS).eq('id', requestId).single(),
      ])
      if (lines.error) throw new Error(`Lignes : lecture impossible (${lines.error.message})`)
      if (request.error) throw new Error(`Brouillon : lecture impossible (${request.error.message})`)
      // Client détecté : colonne à part (migration 20261118170000), son absence n'empêche pas de reprendre le brouillon
      const { data: detected } = await db.from('financing_requests').select('detected_client').eq('id', requestId).maybeSingle()
      const client = ((detected as { detected_client?: DetectedClient | null } | null)?.detected_client) ?? null
      return { lines: (lines.data ?? []) as SavedLine[], meta: request.data as DraftMeta, client }
    },

    async saveAnalysis(requestId, lines, meta, client = null) {
      const { error: metaErr } = await db.from('financing_requests').update(meta).eq('id', requestId).eq('status', RS.draft)
      if (metaErr) throw new Error(`Brouillon : écriture impossible (${metaErr.message})`)
      // Écriture à part : avant la migration, l'analyse doit quand même aboutir
      const { error: clientErr } = await db.from('financing_requests').update({ detected_client: client }).eq('id', requestId).eq('status', RS.draft)
      if (clientErr) console.error('[draft] client détecté non enregistré', clientErr.message)
      // Deux analyses simultanées (deux onglets) ne doivent pas doubler les lignes
      const { error: delErr } = await db.from('line_items').delete().eq('request_id', requestId)
      if (delErr) throw new Error(`Lignes : suppression impossible (${delErr.message})`)
      const { data, error } = await db
        .from('line_items')
        .insert(lines.map(l => ({ ...l, request_id: requestId })))
        .select(LINE_COLUMNS)
      if (error) throw new Error(`Lignes : écriture impossible (${error.message})`)
      return (data ?? []) as SavedLine[]
    },

    async setSelection(requestId, selectedIds) {
      const { error: offErr } = await db.from('line_items').update({ selected: false }).eq('request_id', requestId)
      if (offErr) throw new Error(`Lignes : écriture impossible (${offErr.message})`)
      if (selectedIds.length === 0) return
      const { error } = await db.from('line_items').update({ selected: true }).eq('request_id', requestId).in('id', selectedIds)
      if (error) throw new Error(`Lignes : écriture impossible (${error.message})`)
    },

    async swapDocument(requestId, documentUrl, documentType) {
      const { data, error } = await db
        .from('financing_requests')
        .update({ document_url: documentUrl, document_type: documentType, ...EMPTY_META })
        .eq('id', requestId)
        .eq('status', RS.draft)
        .select('id')
      if (error) throw new Error(`Brouillon : écriture impossible (${error.message})`)
      if (!data?.length) return false
      // Le client lu sur l'ancien document ne vaut plus (colonne à part, voir saveAnalysis)
      await db.from('financing_requests').update({ detected_client: null }).eq('id', requestId)
      const { error: delErr } = await db.from('line_items').delete().eq('request_id', requestId)
      if (delErr) throw new Error(`Lignes : suppression impossible (${delErr.message})`)
      return true
    },

    async deleteDraft(requestId) {
      const { data, error } = await db.from('financing_requests').delete().eq('id', requestId).eq('status', RS.draft).select('id')
      if (error) throw new Error(`Brouillon : suppression impossible (${error.message})`)
      return !!data?.length
    },

    async removeFile(path) {
      const { error } = await db.storage.from('documents').remove([path])
      if (error) throw new Error(error.message)
    },
  }
}

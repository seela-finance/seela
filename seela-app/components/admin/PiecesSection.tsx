import type { SupabaseClient } from '@supabase/supabase-js'
import PiecesCard, { type PieceView } from '@/components/admin/PiecesCard'
import { loadCompanyPieces, piecePreviewUrl } from '@/lib/pieces-store'
import { pieceChecklist, type PieceCompany, type PiecePhase } from '@/lib/pieces'

/** Charge les pièces d'une société et prépare les lignes (aperçus signés 1 h) pour PiecesCard. */
export async function loadPieceViews(db: SupabaseClient, companyId: string, company: PieceCompany, phase: PiecePhase): Promise<PieceView[]> {
  const docs = await loadCompanyPieces(db, companyId)
  const rows = pieceChecklist(company, docs, phase)
  return Promise.all(rows.map(async row => ({
    ...row,
    previewUrl: row.doc ? await piecePreviewUrl(db, row.doc) : null,
    uploadedAt: row.doc && row.status !== 'dispensee' ? row.doc.created_at : null,
  })))
}

/** Pièces avant transmission et, si demandé, pièces de mise en place du contrat. */
export default async function PiecesSection({ db, companyId, company, withContract, canEdit }: {
  db: SupabaseClient; companyId: string; company: PieceCompany; withContract: boolean; canEdit: boolean
}) {
  const [dossier, contrat] = await Promise.all([
    loadPieceViews(db, companyId, company, 'dossier'),
    withContract ? loadPieceViews(db, companyId, company, 'contrat') : Promise.resolve([] as PieceView[]),
  ])
  return (
    <div className="divide-y divide-[var(--line)]">
      <PiecesCard companyId={companyId} rows={dossier} canEdit={canEdit} title="Avant transmission au financeur" />
      {contrat.length > 0 && <PiecesCard companyId={companyId} rows={contrat} canEdit={canEdit} title="Mise en place du contrat" />}
    </div>
  )
}

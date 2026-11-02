// Ligne du journal des actions admin (table admin_events). Sans dépendance serveur : testable.

export type AdminEvent = {
  action: string
  requestId?: string | null
  profileId?: string | null
  leaserId?: string | null
  before?: unknown
  after?: unknown
  note?: string | null
}

export function adminEventRow(adminId: string, event: AdminEvent) {
  const action = event.action.trim()
  if (!adminId) throw new Error('Journal admin : admin inconnu')
  if (!action) throw new Error('Journal admin : action vide')
  return {
    admin_id: adminId,
    action,
    request_id: event.requestId ?? null,
    profile_id: event.profileId ?? null,
    leaser_id: event.leaserId ?? null,
    before: event.before ?? null,
    after: event.after ?? null,
    note: event.note?.trim() || null,
  }
}

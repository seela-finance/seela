import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { classifyMessage, excerpt, MAIL_SYNC_DAYS, needsRescan, normalizeAddress, type FolderState } from '@/lib/crm-mail'
import { open } from '@/lib/secret-box'

const LOCK_MS = 10 * 60 * 1000

export type Mailbox = {
  id: string; user_id: string; email: string; imap_host: string; imap_port: number; password_enc: string
  folders: Record<string, FolderState>; running_since: string | null
}
export type MailSyncResult = { imported: number; scanned: number }

export function imapClient(m: { email: string; imap_host: string; imap_port: number }, password: string) {
  return new ImapFlow({ host: m.imap_host, port: m.imap_port, secure: true, auth: { user: m.email, pass: password }, logger: false, socketTimeout: 60_000 })
}

/** Vérifie les identifiants avant de les enregistrer. Message lisible en cas d'échec. */
export async function testImapLogin(m: { email: string; imap_host: string; imap_port: number }, password: string): Promise<string | null> {
  const client = imapClient(m, password)
  try {
    await client.connect()
    await client.logout()
    return null
  } catch (err) {
    const e = err as { authenticationFailed?: boolean; code?: string }
    if (e.authenticationFailed) return 'Email ou mot de passe refusé par le serveur.'
    if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') return 'Serveur de messagerie injoignable : vérifiez le serveur et le port.'
    return 'Connexion à la boîte impossible.'
  }
}

/**
 * Lit la réception et les envoyés (lecture seule) depuis le dernier passage, ou les 90 derniers jours au premier.
 * Seuls les échanges avec un contact du CRM sont enregistrés, une seule fois par email (Message-ID).
 */
export async function syncMailbox(db: SupabaseClient, mailbox: Mailbox): Promise<MailSyncResult | { skipped: string }> {
  if (mailbox.running_since && Date.now() - Date.parse(mailbox.running_since) < LOCK_MS) return { skipped: 'Synchronisation déjà en cours' }
  await db.from('crm_mailboxes').update({ running_since: new Date().toISOString() }).eq('id', mailbox.id)

  const stats: MailSyncResult = { imported: 0, scanned: 0 }
  const folders = { ...mailbox.folders }
  const client = imapClient(mailbox, open(mailbox.password_enc))
  try {
    const { data: contactRows } = await db.from('contacts').select('id, email, company_id, updated_at').not('email', 'is', null).limit(20000)
    const contactList = (contactRows ?? []) as { id: string; email: string; company_id: string | null; updated_at: string }[]
    const byEmail = new Map(contactList.map(c => [normalizeAddress(c.email), c]))
    const latestContactAt = contactList.reduce<string | null>((m, c) => (!m || c.updated_at > m ? c.updated_at : m), null)
    const emails = new Set(byEmail.keys())

    await client.connect()
    const list = await client.list()
    const sent = list.find(f => f.specialUse === '\\Sent') ?? list.find(f => /(^|[./])(sent|envoy)/i.test(f.path))
    const paths = ['INBOX', ...(sent ? [sent.path] : [])]
    const rows: Record<string, unknown>[] = []

    for (const path of paths) {
      const lock = await client.getMailboxLock(path, { readOnly: true })
      try {
        const box = client.mailbox
        const uidValidity = box ? String(box.uidValidity) : ''
        const prev = folders[path]
        const fresh = needsRescan(prev, uidValidity, latestContactAt)
        let lastUid = prev && prev.uidValidity === uidValidity ? prev.lastUid : 0
        const from = fresh ? 0 : lastUid
        const uids = fresh
          ? (await client.search({ since: new Date(Date.now() - MAIL_SYNC_DAYS * 86_400_000) }, { uid: true })) || []
          : (await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })) || []
        const todo = uids.filter(u => u > from)
        if (todo.length) {
          const matched: { uid: number; messageId: string | null; date: Date; subject: string | null; from: string[]; to: string[]; cc: string[]; direction: 'sent' | 'received'; contact: { id: string; company_id: string | null } }[] = []
          for await (const msg of client.fetch(todo.join(','), { uid: true, envelope: true, internalDate: true }, { uid: true })) {
            stats.scanned++
            lastUid = Math.max(lastUid, msg.uid)
            const env = msg.envelope
            if (!env) continue
            const c = classifyMessage({ from: env.from ?? [], to: env.to ?? [], cc: env.cc ?? [] }, mailbox.email, emails)
            if (!c) continue
            matched.push({
              uid: msg.uid, messageId: env.messageId ?? null, date: new Date(env.date ?? msg.internalDate ?? Date.now()),
              subject: env.subject ?? null, direction: c.direction, contact: byEmail.get(c.contactEmails[0])!,
              from: (env.from ?? []).map(a => normalizeAddress(a.address)), to: (env.to ?? []).map(a => normalizeAddress(a.address)), cc: (env.cc ?? []).map(a => normalizeAddress(a.address)),
            })
          }
          for (const m of matched) {
            const full = await client.fetchOne(String(m.uid), { source: true }, { uid: true })
            const text = full && full.source ? (await simpleParser(full.source)).text : null
            rows.push({
              type: 'email', source: 'mailbox', event: m.direction, occurred_at: m.date.toISOString(),
              external_id: m.messageId ?? `${mailbox.email}:${path}:${uidValidity}:${m.uid}`,
              title: m.subject?.slice(0, 300) ?? null, body: excerpt(text), author_id: m.direction === 'sent' ? mailbox.user_id : null,
              contact_id: m.contact.id, company_id: m.contact.company_id,
              metadata: { from: m.from, to: m.to, cc: m.cc, mailbox: mailbox.email },
            })
          }
        }
        folders[path] = { uidValidity, lastUid, contactsAt: latestContactAt }
      } finally {
        lock.release()
      }
    }
    await client.logout()

    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await db.from('crm_activities').upsert(rows.slice(i, i + 500), { onConflict: 'source,external_id', ignoreDuplicates: true }).select('id')
      if (error) throw error
      stats.imported += data?.length ?? 0
    }
    await db.from('crm_mailboxes').update({
      folders, last_sync_at: new Date().toISOString(), running_since: null, last_error: null, last_result: stats, updated_at: new Date().toISOString(),
    }).eq('id', mailbox.id)
    return stats
  } catch (err) {
    client.close()
    const message = err instanceof Error ? err.message : String(err)
    await db.from('crm_mailboxes').update({ running_since: null, last_error: message.slice(0, 500), last_sync_at: new Date().toISOString() }).eq('id', mailbox.id)
    throw err
  }
}

// Équipe du back-office : ajouter un membre, changer son rôle, le retirer.
// Logique sans dépendance serveur (la base est injectée, lib/admin-team-store.ts) : testable.
import { ROLE_LABEL, isAdminRole, type AdminRole } from '@/lib/admin-roles'

/** Erreur à afficher telle quelle ; rien n'a été modifié. */
export class TeamError extends Error {}

export type TeamMember = { userId: string; name: string; role: AdminRole; email: string | null; createdAt: string }

/** Compte everlease trouvé par son email. `confirmed` : l'adresse a été vérifiée (lien reçu par email). */
export type Account = { userId: string; email: string; confirmed: boolean }

export interface TeamStore {
  findAccount(email: string): Promise<Account | null>
  loadMember(userId: string): Promise<TeamMember | null>
  countAdmins(): Promise<number>
  insertMember(userId: string, name: string, role: AdminRole): Promise<void>
  updateRole(userId: string, role: AdminRole): Promise<void>
  deleteMember(userId: string): Promise<void>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseRole(raw: unknown): AdminRole {
  if (!isAdminRole(raw)) throw new TeamError('Rôle inconnu.')
  return raw
}

/**
 * Donne accès au back-office à un compte existant. La personne crée d'abord son compte sur /auth :
 * on n'ajoute qu'une adresse confirmée, sinon n'importe qui pourrait créer un compte à l'email d'un collègue
 * et en recevoir les droits.
 */
export async function addMember(store: TeamStore, input: { email: unknown; name: unknown; role: unknown }): Promise<TeamMember> {
  const email = String(input.email ?? '').trim().toLowerCase()
  const name = String(input.name ?? '').trim().slice(0, 80)
  const role = parseRole(input.role)
  if (!EMAIL.test(email)) throw new TeamError('Email invalide.')
  if (!name) throw new TeamError('Indiquez le prénom ou le nom affiché dans le journal.')

  const account = await store.findAccount(email)
  if (!account) throw new TeamError('Aucun compte everlease à cet email : la personne doit d’abord en créer un sur everlease.fr/auth.')
  if (!account.confirmed) throw new TeamError('Cette adresse n’est pas encore confirmée : la personne doit cliquer sur le lien reçu par email.')
  if (await store.loadMember(account.userId)) throw new TeamError('Cette personne fait déjà partie de l’équipe.')

  await store.insertMember(account.userId, name, role)
  return { userId: account.userId, name, role, email: account.email, createdAt: new Date().toISOString() }
}

/** Change le rôle d'un membre. Jamais le sien (pas de perte d'accès par erreur), jamais le dernier admin. */
export async function changeRole(store: TeamStore, actorId: string, userId: string, rawRole: unknown): Promise<{ before: AdminRole; after: AdminRole }> {
  const role = parseRole(rawRole)
  if (userId === actorId) throw new TeamError('Vous ne pouvez pas changer votre propre rôle.')
  const member = await store.loadMember(userId)
  if (!member) throw new TeamError('Membre introuvable.')
  if (member.role === role) throw new TeamError(`Ce membre est déjà ${ROLE_LABEL[role].toLowerCase()}.`)
  if (member.role === 'admin' && (await store.countAdmins()) <= 1) throw new TeamError('Il doit rester au moins un admin.')
  const before = member.role
  await store.updateRole(userId, role)
  return { before, after: role }
}

/** Retire un membre du back-office ; son compte everlease et son historique restent. */
export async function removeMember(store: TeamStore, actorId: string, userId: string): Promise<TeamMember> {
  if (userId === actorId) throw new TeamError('Vous ne pouvez pas vous retirer vous-même.')
  const member = await store.loadMember(userId)
  if (!member) throw new TeamError('Membre introuvable.')
  if (member.role === 'admin' && (await store.countAdmins()) <= 1) throw new TeamError('Il doit rester au moins un admin.')
  await store.deleteMember(userId)
  return member
}

import { test, expect } from '@playwright/test'
import { can } from '../../lib/admin-roles'
import { TeamError, addMember, changeRole, removeMember, type Account, type TeamMember, type TeamStore } from '../../lib/admin-team'

test('droits par rôle : le commercial consulte et note, rien d’autre', () => {
  for (const c of ['view', 'add_notes', 'decide_requests', 'manage_leasers', 'manage_team'] as const) expect(can('admin', c)).toBe(true)
  expect(can('commercial', 'view')).toBe(true)
  expect(can('commercial', 'add_notes')).toBe(true)
  expect(can('commercial', 'decide_requests')).toBe(false)
  expect(can('commercial', 'manage_leasers')).toBe(false)
  expect(can('commercial', 'manage_team')).toBe(false)
  // Valeur inattendue en base : consultation seulement
  expect(can('superadmin', 'manage_team')).toBe(false)
  expect(can(null, 'view')).toBe(true)
})

const LOUIS: TeamMember = { userId: 'u-louis', name: 'Louis', role: 'admin', email: 'louis@everlease.fr', createdAt: '2026-11-02' }

function makeStore(members: TeamMember[] = [LOUIS], accounts: Account[] = []) {
  const state = [...members]
  const store: TeamStore = {
    findAccount: async email => accounts.find(a => a.email === email) ?? null,
    loadMember: async id => state.find(m => m.userId === id) ?? null,
    countAdmins: async () => state.filter(m => m.role === 'admin').length,
    insertMember: async (userId, name, role) => { state.push({ userId, name, role, email: null, createdAt: '' }) },
    updateRole: async (userId, role) => { state.find(m => m.userId === userId)!.role = role },
    deleteMember: async userId => { state.splice(state.findIndex(m => m.userId === userId), 1) },
  }
  return { store, state }
}

const LORENZO: Account = { userId: 'u-lorenzo', email: 'lorenzo@everlease.fr', confirmed: true }

test('ajouter un membre : compte existant et confirmé, email insensible à la casse', async () => {
  const { store, state } = makeStore([LOUIS], [LORENZO])
  const member = await addMember(store, { email: '  Lorenzo@Everlease.fr ', name: ' Lorenzo ', role: 'commercial' })
  expect(member).toMatchObject({ userId: 'u-lorenzo', name: 'Lorenzo', role: 'commercial' })
  expect(state.map(m => m.userId)).toEqual(['u-louis', 'u-lorenzo'])
})

test('ajouter un membre : refus clairs, rien n’est écrit', async () => {
  const unconfirmed = { ...LORENZO, confirmed: false }
  const cases: [Account[], Record<string, string>, RegExp][] = [
    [[], { email: 'lorenzo@everlease.fr', name: 'Lorenzo', role: 'commercial' }, /d’abord en créer un/],
    [[unconfirmed], { email: 'lorenzo@everlease.fr', name: 'Lorenzo', role: 'commercial' }, /pas encore confirmée/],
    [[LORENZO], { email: 'lorenzo@', name: 'Lorenzo', role: 'commercial' }, /Email invalide/],
    [[LORENZO], { email: 'lorenzo@everlease.fr', name: ' ', role: 'commercial' }, /nom affiché/],
    [[LORENZO], { email: 'lorenzo@everlease.fr', name: 'Lorenzo', role: 'superadmin' }, /Rôle inconnu/],
  ]
  for (const [accounts, input, message] of cases) {
    const { store, state } = makeStore([LOUIS], accounts)
    await expect(addMember(store, input)).rejects.toThrow(message)
    expect(state).toHaveLength(1)
  }
  const { store } = makeStore([LOUIS], [{ ...LORENZO, userId: 'u-louis', email: 'louis@everlease.fr' }])
  await expect(addMember(store, { email: 'louis@everlease.fr', name: 'Louis', role: 'admin' })).rejects.toThrow(/déjà partie/)
})

test('changer de rôle : jamais le sien, jamais le dernier admin', async () => {
  const lorenzo: TeamMember = { ...LOUIS, userId: 'u-lorenzo', name: 'Lorenzo', role: 'commercial' }
  const { store, state } = makeStore([LOUIS, lorenzo])
  expect(await changeRole(store, 'u-louis', 'u-lorenzo', 'admin')).toEqual({ before: 'commercial', after: 'admin' })
  expect(state.find(m => m.userId === 'u-lorenzo')?.role).toBe('admin')
  await expect(changeRole(store, 'u-louis', 'u-louis', 'commercial')).rejects.toThrow(/propre rôle/)
  await expect(changeRole(store, 'u-louis', 'u-lorenzo', 'admin')).rejects.toThrow(/déjà admin/)
  await expect(changeRole(store, 'u-louis', 'u-inconnu', 'admin')).rejects.toBeInstanceOf(TeamError)

  // Deux admins : l'un peut rétrograder l'autre ; seul admin restant : impossible de le rétrograder
  await changeRole(store, 'u-louis', 'u-lorenzo', 'commercial')
  const solo = makeStore([LOUIS, lorenzo])
  await expect(changeRole(solo.store, 'u-lorenzo', 'u-louis', 'commercial')).rejects.toThrow(/au moins un admin/)
})

test('retirer un membre : jamais soi-même, jamais le dernier admin', async () => {
  const lorenzo: TeamMember = { ...LOUIS, userId: 'u-lorenzo', name: 'Lorenzo', role: 'commercial' }
  const { store, state } = makeStore([LOUIS, lorenzo])
  await expect(removeMember(store, 'u-louis', 'u-louis')).rejects.toThrow(/vous retirer vous-même/)
  expect((await removeMember(store, 'u-louis', 'u-lorenzo')).name).toBe('Lorenzo')
  expect(state.map(m => m.userId)).toEqual(['u-louis'])
  const solo = makeStore([LOUIS, lorenzo])
  await expect(removeMember(solo.store, 'u-lorenzo', 'u-louis')).rejects.toThrow(/au moins un admin/)
})

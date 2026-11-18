// Rôles de l'équipe du back-office et ce que chacun peut faire. Sans dépendance serveur : testable,
// utilisable par la navigation (client) comme par les pages et les Server Actions (serveur).

export const ADMIN_ROLES = ['admin', 'commercial'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ROLE_LABEL: Record<AdminRole, string> = {
  admin: 'Admin',
  commercial: 'Commercial',
}

export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  admin: 'Tous les droits : dossiers, leasers et barèmes, équipe.',
  commercial: 'Utilise le CRM, consulte les dossiers et les sociétés, ajoute des notes internes. Ne voit pas les leasers.',
}

export type Capability =
  /** Consulter dossiers et sociétés */
  | 'view'
  /** Ajouter une note interne à un dossier */
  | 'add_notes'
  /** Valider, transmettre, refuser, relancer le matching, offre manuelle, contre-proposition */
  | 'decide_requests'
  /** Leasers : barèmes, conditions, commissions, simulateur */
  | 'manage_leasers'
  /** Ajouter, retirer, changer le rôle d'un membre */
  | 'manage_team'
  /** CRM : sociétés, contacts, deals, activités, tâches (consulter et modifier) */
  | 'crm'

const CAPABILITIES: Record<AdminRole, Capability[]> = {
  admin: ['view', 'add_notes', 'decide_requests', 'manage_leasers', 'manage_team', 'crm'],
  commercial: ['view', 'add_notes', 'crm'],
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value)
}

/** Un rôle inconnu (valeur inattendue en base) ne donne aucun droit au-delà de la consultation. */
export function can(role: string | null | undefined, capability: Capability): boolean {
  if (!isAdminRole(role)) return capability === 'view'
  return CAPABILITIES[role].includes(capability)
}

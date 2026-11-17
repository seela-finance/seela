// Analyse crédit d'un dossier (agent « analyste crédit ») : indicateurs calculés, alertes, prompt du
// modèle, lecture de sa réponse, rendu pour les emails et le récapitulatif.
// Fonctions pures, sans dépendance serveur : testables. La lecture en base, l'appel au modèle et
// l'enregistrement sont dans lib/credit-analyst.ts.
import { familyOf, FINANCING_TYPES } from '@/lib/equipment'
import { ALREADY_OFFERED_REASON, lineFamily, type MatchingLine } from '@/lib/matching-rules'
import type { RegistryCompany } from '@/lib/company-registry'
import { RS, requestStatusInfo } from '@/lib/status'
import { requestLabel } from '@/lib/request-label'
import { esc } from '@/lib/email'

// ── Avis ─────────────────────────────────────────────────────────────

export const CREDIT_OPINIONS = ['favorable', 'favorable_sous_reserve', 'defavorable', 'a_completer'] as const
export type CreditOpinion = (typeof CREDIT_OPINIONS)[number]

type Badge = { label: string; color: string; bg: string; dot: string }

// Mêmes tons que les statuts (lib/status.ts) : ok, warning, danger, neutre
export const CREDIT_OPINION: Record<CreditOpinion, Badge> = {
  favorable:              { label: 'Favorable',              color: 'var(--ok)',      bg: 'var(--ok-soft)',      dot: 'var(--ok)' },
  favorable_sous_reserve: { label: 'Favorable sous réserve', color: 'var(--warning)', bg: 'var(--warning-soft)', dot: 'var(--warning)' },
  defavorable:            { label: 'Défavorable',            color: 'var(--danger)',  bg: 'var(--danger-soft)',  dot: 'var(--danger)' },
  a_completer:            { label: 'À compléter',            color: 'var(--ink-2)',   bg: 'var(--raised)',       dot: 'var(--line-strong)' },
}

export function isCreditOpinion(v: unknown): v is CreditOpinion {
  return typeof v === 'string' && (CREDIT_OPINIONS as readonly string[]).includes(v)
}

/** Libellé et couleurs d'un avis lu en base (valeur inconnue → « À compléter »). */
export function opinionInfo(avis: string | null | undefined): Badge {
  return isCreditOpinion(avis) ? CREDIT_OPINION[avis] : CREDIT_OPINION.a_completer
}

// ── Dossier (données lues en base, rassemblées par lib/credit-analyst.ts) ──

export type DossierLine = MatchingLine & {
  description: string | null
  quantity: number | null
  unit_price: number | null
  selected: boolean | null
}

export type DossierOffer = {
  leaser_name: string | null
  monthly_payment: number | null
  duration_months: number | null
  rate: number | null
  status: string | null
  selected: boolean | null
}

export type DossierHistoryItem = { id: string; status: string | null; total_amount: number | null; created_at: string }

export type LeaserVerdict = { name: string; reasons: string[] }

export type RegistryLookup = { status: 'ok' | 'not_found' | 'error' | 'no_siren'; company: RegistryCompany | null }

export type CreditDossier = {
  request: {
    id: string
    status: string | null
    total_amount: number | null
    duration_months: number | null
    periodicite: string | null
    document_type: string | null
    notes: string | null
    supplier_name: string | null
    supplier_siren: string | null
    supplier_address: string | null
    document_number: string | null
    document_date: string | null
    created_at: string
  }
  company: {
    name: string | null
    siren: string | null
    legal_form: string | null
    naf_code: string | null
    creation_year: number | null
    address: string | null
    revenue_bracket: string | null
    age_bracket: string | null
    headcount_bracket: string | null
    revenue_declared: number | null
    result_declared: number | null
    kyc_completed: boolean | null
    financial_docs_uploaded: boolean | null
    seela_score: number | null
    seela_score_grade: string | null
    lifecycle_stage: string | null
  } | null
  contact: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null; job_title: string | null } | null
  lines: DossierLine[]
  offers: DossierOffer[]
  /** Autres dossiers de la même société, hors celui-ci */
  history: DossierHistoryItem[]
  registry: RegistryLookup
  supplierRegistry: RegistryLookup
  /** Réponse de chaque leaser actif avec les barèmes actuels (liste vide de raisons = éligible) */
  leaserVerdicts: LeaserVerdict[]
}

// ── Indicateurs ──────────────────────────────────────────────────────

export type CreditFlag = { code: string; label: string; severity: 'danger' | 'warning' | 'info' }

export type CreditIndicators = {
  amount: number
  duration: number | null
  financingType: string
  periodicite: string
  /** Loyer de l'offre choisie, sinon le plus bas des offres indicatives */
  monthly: number | null
  annualRent: number | null
  revenue: number | null
  revenueYear: string | null
  revenueSource: 'registre' | 'déclaré' | null
  netResult: number | null
  netResultSource: 'registre' | 'déclaré' | null
  amountToRevenuePct: number | null
  annualRentToRevenuePct: number | null
  annualRentToResultPct: number | null
  companyAgeYears: number | null
  headcount: string | null
  mainFamily: string | null
  families: string[]
  documentAgeDays: number | null
  eligibleLeasers: string[]
  previousRequests: number
  refusedRequests: number
  activeContracts: number
  flags: CreditFlag[]
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null)
const pct = (a: number | null, b: number | null) => (a != null && b != null && b > 0 ? Math.round((a / b) * 1000) / 10 : null)

const frPct = (n: number) => `${n.toLocaleString('fr-FR')} %`

const PERIODS_PER_YEAR: Record<string, number> = { mensuelle: 12, trimestrielle: 4, annuelle: 1 }

/** Immatériel ou peu récupérable : un financeur y regarde à deux fois. */
const LOW_RECOVERY_TYPES = ['logiciels-licences']
const LOW_RECOVERY_FAMILIES = ['mobilier']

/** Années révolues depuis la création : date exacte du registre, sinon borne basse depuis l'année déclarée. */
export function companyAge(createdOn: string | null, creationYear: number | null, now: Date): number | null {
  if (createdOn && !Number.isNaN(Date.parse(createdOn))) {
    const c = new Date(createdOn)
    const before = now.getMonth() < c.getMonth() || (now.getMonth() === c.getMonth() && now.getDate() < c.getDate())
    return Math.max(0, now.getFullYear() - c.getFullYear() - (before ? 1 : 0))
  }
  if (creationYear != null && Number.isInteger(creationYear) && creationYear > 1800 && creationYear <= now.getFullYear()) {
    // Comme lib/company-age.ts : société supposée créée le 31 décembre, pour ne jamais surestimer
    return Math.max(0, now.getFullYear() - creationYear - 1)
  }
  return null
}

function sirenOf(s: string | null | undefined): string | null {
  const digits = (s ?? '').replace(/\D/g, '')
  return digits.length === 9 || digits.length === 14 ? digits.slice(0, 9) : null
}

/** Ratios et alertes d'un dossier, calculés par le code : le modèle les cite, il ne les recalcule pas. */
export function computeIndicators(d: CreditDossier, now: Date = new Date()): CreditIndicators {
  const flags: CreditFlag[] = []
  const flag = (code: string, label: string, severity: CreditFlag['severity'] = 'warning') => flags.push({ code, label, severity })

  const amount = num(d.request.total_amount) ?? 0
  const duration = num(d.request.duration_months)
  const periodicite = d.request.periodicite ?? 'mensuelle'
  const financingSlug = d.request.document_type === 'facture' ? 'lease_back' : 'leasing'
  const financingType = FINANCING_TYPES.find(f => f.slug === financingSlug)?.label ?? financingSlug

  const selected = d.offers.find(o => o.selected) ?? null
  const cheapest = [...d.offers].filter(o => num(o.monthly_payment) != null).sort((a, b) => num(a.monthly_payment)! - num(b.monthly_payment)!)[0] ?? null
  const monthly = num(selected?.monthly_payment) ?? num(cheapest?.monthly_payment)
  const annualRent = monthly == null ? null : Math.round(monthly * (PERIODS_PER_YEAR[periodicite] ?? 12) * 100) / 100

  // Finances : registre (publié) avant déclaré
  const registry = d.registry.company
  const latest = registry?.finances.find(f => f.revenue != null || f.netResult != null) ?? null
  const revenue = latest?.revenue ?? num(d.company?.revenue_declared)
  const revenueSource = latest?.revenue != null ? 'registre' : num(d.company?.revenue_declared) != null ? 'déclaré' : null
  const netResult = latest?.netResult ?? num(d.company?.result_declared)
  const netResultSource = latest?.netResult != null ? 'registre' : num(d.company?.result_declared) != null ? 'déclaré' : null

  const companyAgeYears = companyAge(registry?.createdOn ?? null, num(d.company?.creation_year), now)
  const headcount = registry?.headcount ?? d.company?.headcount_bracket ?? null

  const selectedLines = d.lines.filter(l => l.selected !== false)
  const main = [...selectedLines].sort((a, b) => (num(b.total_price) ?? 0) - (num(a.total_price) ?? 0))[0]
  const familySlugs = [...new Set(selectedLines.map(lineFamily).filter((f): f is string => !!f))]
  const families = familySlugs.map(f => familyOf(f)?.label ?? f)
  const mainFamily = main ? familyOf(lineFamily(main))?.label ?? lineFamily(main) : null

  const documentAgeDays = d.request.document_date && !Number.isNaN(Date.parse(d.request.document_date))
    ? Math.floor((now.getTime() - Date.parse(d.request.document_date)) / 86_400_000)
    : null

  // Un financeur qui a déjà fait une offre sur le dossier reste éligible : seul ce motif ne compte pas
  const blocking = (v: LeaserVerdict) => v.reasons.filter(r => r !== ALREADY_OFFERED_REASON)
  const eligibleLeasers = d.leaserVerdicts.filter(v => blocking(v).length === 0).map(v => v.name)
  const history = d.history.filter(h => h.id !== d.request.id && h.status !== RS.draft)
  const refusedRequests = history.filter(h => h.status === RS.refused).length
  const activeContracts = history.filter(h => h.status === RS.active || h.status === RS.leaser_confirmed).length

  // ── Alertes ──
  const companySiren = sirenOf(d.company?.siren)
  if (!companySiren) flag('siren_absent', 'SIREN du client absent ou invalide')
  else if (d.registry.status === 'not_found') flag('registre_introuvable', 'Société introuvable au registre (SIREN à vérifier)')
  else if (d.registry.status === 'error') flag('registre_indisponible', 'Registre des entreprises indisponible : identité non vérifiée', 'info')
  if (registry && !registry.active) flag('societe_cessee', `Société cessée au registre${registry.closedOn ? ` (${registry.closedOn})` : ''}`, 'danger')

  if (companyAgeYears != null && companyAgeYears < 1) flag('societe_moins_1_an', 'Société de moins d’un an', 'danger')
  else if (companyAgeYears != null && companyAgeYears < 2) flag('societe_moins_2_ans', 'Société de moins de 2 ans')
  else if (companyAgeYears == null) flag('anciennete_inconnue', 'Ancienneté de la société inconnue')

  if (revenue == null) flag('ca_inconnu', 'Chiffre d’affaires inconnu (ni publié au registre, ni déclaré)')
  const amountToRevenuePct = pct(amount, revenue)
  if (amountToRevenuePct != null && amountToRevenuePct > 50) flag('montant_ca_eleve', `Montant financé = ${frPct(amountToRevenuePct)} du CA`, 'danger')
  else if (amountToRevenuePct != null && amountToRevenuePct > 25) flag('montant_ca_notable', `Montant financé = ${frPct(amountToRevenuePct)} du CA`)
  const annualRentToRevenuePct = pct(annualRent, revenue)
  if (annualRentToRevenuePct != null && annualRentToRevenuePct > 15) flag('loyer_ca_eleve', `Loyer annuel = ${frPct(annualRentToRevenuePct)} du CA`)
  const annualRentToResultPct = netResult != null && netResult > 0 ? pct(annualRent, netResult) : null
  if (netResult != null && netResult < 0) flag('resultat_negatif', `Dernier résultat net négatif (${netResultSource})`)
  else if (annualRentToResultPct != null && annualRentToResultPct > 100) flag('loyer_superieur_resultat', 'Loyer annuel supérieur au dernier résultat net')

  if (financingSlug === 'lease_back') {
    if (documentAgeDays == null) flag('facture_sans_date', 'Date de la facture non lue : ancienneté du lease-back à vérifier', 'info')
    else if (documentAgeDays > 180) flag('facture_ancienne', `Facture datée de ${documentAgeDays} jours : lease-back difficile au-delà de 6 mois`, 'danger')
    else if (documentAgeDays > 90) flag('facture_recente_limite', `Facture datée de ${documentAgeDays} jours : lease-back à placer vite`)
  }

  const supplierSiren = sirenOf(d.request.supplier_siren)
  if (supplierSiren && companySiren && supplierSiren === companySiren) flag('fournisseur_client', 'Fournisseur identique au client (auto-facturation)', 'danger')
  if (supplierSiren && d.supplierRegistry.status === 'not_found') flag('fournisseur_introuvable', 'Fournisseur introuvable au registre')
  if (d.supplierRegistry.company && !d.supplierRegistry.company.active) flag('fournisseur_cesse', 'Fournisseur cessé au registre', 'danger')
  if (!d.request.supplier_name && !supplierSiren) flag('fournisseur_inconnu', 'Fournisseur non identifié sur le document', 'info')

  if (selectedLines.length === 0) flag('aucune_ligne', 'Aucune ligne financée')
  if (selectedLines.some(l => l.equipment_type && LOW_RECOVERY_TYPES.includes(l.equipment_type))) flag('part_immaterielle', 'Part immatérielle (logiciels, licences) : récupérabilité faible')
  if (familySlugs.some(f => LOW_RECOVERY_FAMILIES.includes(f))) flag('actif_peu_recuperable', 'Actif peu récupérable en cas de défaut (mobilier, agencement)', 'info')
  if (duration != null && duration >= 60 && familySlugs.includes('informatique')) flag('duree_longue_informatique', 'Durée de 60 mois sur de l’informatique : au-delà de la durée de vie usuelle', 'info')

  if (eligibleLeasers.length === 0 && d.leaserVerdicts.length > 0) flag('aucun_leaser', 'Aucun financeur éligible avec les barèmes actuels')
  if (refusedRequests > 0) flag('refus_precedent', `${refusedRequests} dossier${refusedRequests > 1 ? 's' : ''} précédent${refusedRequests > 1 ? 's' : ''} refusé${refusedRequests > 1 ? 's' : ''} chez everlease`)
  if (d.company?.seela_score != null && d.company.seela_score < 35) flag('score_faible', `Score everlease faible (${d.company.seela_score}/100)`)
  if (d.company && !d.company.kyc_completed) flag('kyc_incomplet', 'KYC non complété par le client', 'info')
  if (d.company && !d.company.financial_docs_uploaded && revenueSource !== 'registre') flag('sans_bilan', 'Aucun document financier déposé', 'info')

  return {
    amount, duration, financingType, periodicite, monthly, annualRent,
    revenue, revenueYear: latest?.year ?? null, revenueSource, netResult, netResultSource,
    amountToRevenuePct, annualRentToRevenuePct, annualRentToResultPct,
    companyAgeYears, headcount, mainFamily, families, documentAgeDays, eligibleLeasers,
    previousRequests: history.length, refusedRequests, activeContracts, flags,
  }
}

// ── Prompt ───────────────────────────────────────────────────────────

export const CREDIT_ANALYST_SYSTEM = `Tu es l'analyste crédit senior d'everlease, courtier en financement locatif (leasing, LLD, lease-back) de matériel professionnel en France. Tu étudies chaque dossier entrant comme le ferait l'analyste d'un établissement financier avant d'accepter de le financer, puis tu conseilles l'équipe everlease sur le placement du dossier auprès des financeurs partenaires.

Méthode, dans l'ordre :
1. L'entreprise : solidité (chiffre d'affaires, résultat, ancienneté, forme juridique, effectif, secteur NAF), situation au registre, cohérence entre le déclaré et le registre.
2. L'actif : nature, récupérabilité et valeur de revente, obsolescence, cohérence quantités et prix, part immatérielle ou de services, fournisseur (existence, lien éventuel avec le client).
3. L'opération : montant rapporté à la taille de l'entreprise, loyer rapporté au chiffre d'affaires et au résultat, durée rapportée à la durée de vie du matériel, particularités du lease-back (facture déjà payée, date de la facture).
4. Le dossier : remarques du client, historique chez everlease, réponse des financeurs partenaires avec les barèmes actuels.

Règles :
- Tu n'inventes rien : tu ne t'appuies que sur les données fournies. Une donnée absente est un point à compléter, jamais une hypothèse.
- Les indicateurs chiffrés et les alertes sont déjà calculés : cite-les, ne les recalcule pas, ne les contredis pas.
- Français sobre et précis, destiné à l'équipe everlease. Pas de formule de politesse, pas de titre.
- Les questions au client et les pièces à demander sont concrètes et actionnables (une idée par élément, 3 à 6 éléments par liste, listes vides autorisées).
- Avis : "favorable" (plaçable en l'état), "favorable_sous_reserve" (plaçable sous conditions ou après des compléments mineurs), "defavorable" (ne pas présenter aux financeurs), "a_completer" (impossible de se prononcer sans des pièces essentielles).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "avis": "favorable" | "favorable_sous_reserve" | "defavorable" | "a_completer",
  "confiance": "haute" | "moyenne" | "basse",
  "synthese": "3 à 5 phrases : l'entreprise, l'actif, l'opération, la conclusion",
  "points_forts": ["…"],
  "points_vigilance": ["…"],
  "questions_client": ["…"],
  "pieces_a_demander": ["…"],
  "placement": { "financeur_recommande": "nom d'un financeur éligible, ou null", "strategie": "comment présenter le dossier et à qui, en 1 à 3 phrases" }
}`

const registryForPrompt = (r: RegistryLookup) =>
  r.status !== 'ok' || !r.company
    ? { statut: r.status === 'no_siren' ? 'pas de SIREN' : r.status === 'not_found' ? 'introuvable' : r.status === 'error' ? 'indisponible' : 'inconnu' }
    : {
        statut: r.company.active ? 'active' : 'cessée',
        cessee_le: r.company.closedOn,
        nom: r.company.name,
        creee_le: r.company.createdOn,
        forme_juridique: r.company.legalForm,
        naf: r.company.nafCode,
        effectif: r.company.headcount,
        categorie: r.company.category,
        etablissements: r.company.establishments,
        dirigeants: r.company.directors.slice(0, 6),
        finances_publiees: r.company.finances.slice(0, 3),
      }

/** Message utilisateur : le dossier en JSON, sans identifiants techniques ni coordonnées du contact. */
export function buildUserPrompt(d: CreditDossier, ind: CreditIndicators, now: Date = new Date()): string {
  const data = {
    date_analyse: now.toISOString().slice(0, 10),
    dossier: {
      reference: requestLabel(d.request),
      statut: requestStatusInfo(d.request.status).label,
      type_financement: ind.financingType,
      montant_ht: ind.amount,
      duree_mois: ind.duration,
      periodicite: ind.periodicite,
      remarques_client: d.request.notes,
      document: { type: d.request.document_type, numero: d.request.document_number, date: d.request.document_date, age_jours: ind.documentAgeDays },
      fournisseur: { nom: d.request.supplier_name, siren: d.request.supplier_siren, adresse: d.request.supplier_address, registre: registryForPrompt(d.supplierRegistry) },
      cree_le: d.request.created_at.slice(0, 10),
    },
    entreprise: d.company && {
      nom: d.company.name,
      siren: d.company.siren,
      forme_juridique: d.company.legal_form,
      naf: d.company.naf_code,
      annee_creation: d.company.creation_year,
      tranche_ca: d.company.revenue_bracket,
      tranche_effectif: d.company.headcount_bracket,
      ca_declare: d.company.revenue_declared,
      resultat_declare: d.company.result_declared,
      kyc_complete: d.company.kyc_completed,
      documents_financiers_deposes: d.company.financial_docs_uploaded,
      score_everlease: d.company.seela_score,
      grade_everlease: d.company.seela_score_grade,
      fonction_du_contact: d.contact?.job_title ?? null,
      registre: registryForPrompt(d.registry),
    },
    lignes_financees: d.lines.filter(l => l.selected !== false).map(l => ({
      description: l.description, quantite: l.quantity, prix_unitaire_ht: l.unit_price, total_ht: l.total_price,
      famille: familyOf(lineFamily(l))?.label ?? l.category ?? null, type: l.equipment_type,
    })),
    lignes_ecartees_par_le_client: d.lines.filter(l => l.selected === false).map(l => ({ description: l.description, total_ht: l.total_price })),
    offres_indicatives: d.offers.map(o => ({ financeur: o.leaser_name, loyer: o.monthly_payment, duree_mois: o.duration_months, taux_annuel_pct: o.rate, statut: o.status, choisie_par_le_client: !!o.selected })),
    reponse_des_financeurs_aux_baremes_actuels: d.leaserVerdicts.map(v => ({ financeur: v.name, eligible: v.reasons.every(r => r === ALREADY_OFFERED_REASON), motifs: v.reasons })),
    historique_everlease: d.history.filter(h => h.id !== d.request.id).map(h => ({ statut: requestStatusInfo(h.status).label, montant_ht: h.total_amount, date: h.created_at.slice(0, 10) })),
    indicateurs_calcules: {
      loyer_retenu: ind.monthly, loyer_annuel: ind.annualRent,
      ca_retenu: ind.revenue, ca_source: ind.revenueSource, ca_exercice: ind.revenueYear,
      resultat_net_retenu: ind.netResult, resultat_source: ind.netResultSource,
      montant_sur_ca_pct: ind.amountToRevenuePct, loyer_annuel_sur_ca_pct: ind.annualRentToRevenuePct, loyer_annuel_sur_resultat_pct: ind.annualRentToResultPct,
      anciennete_annees: ind.companyAgeYears, effectif: ind.headcount, famille_principale: ind.mainFamily, familles: ind.families,
      financeurs_eligibles: ind.eligibleLeasers, dossiers_precedents: ind.previousRequests, dossiers_refuses: ind.refusedRequests, contrats_actifs: ind.activeContracts,
    },
    alertes: ind.flags.map(f => `${f.severity}: ${f.label}`),
  }
  return `Dossier à analyser :\n\`\`\`json\n${JSON.stringify(data, null, 1)}\n\`\`\``
}

// ── Réponse du modèle ────────────────────────────────────────────────

export type CreditAnalysis = {
  avis: CreditOpinion
  confiance: 'haute' | 'moyenne' | 'basse'
  synthese: string
  points_forts: string[]
  points_vigilance: string[]
  questions_client: string[]
  pieces_a_demander: string[]
  placement: { financeur_recommande: string | null; strategie: string | null }
}

export class CreditAnalysisParseError extends Error {}

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(x => x.trim().slice(0, 600)).slice(0, 12) : []
const str = (v: unknown, max = 4000): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** Lit la réponse du modèle (JSON, éventuellement entouré de texte) ; lève si elle est inexploitable. */
export function parseCreditAnalysis(text: string): CreditAnalysis {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new CreditAnalysisParseError('Réponse du modèle sans JSON')
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    throw new CreditAnalysisParseError('Réponse du modèle : JSON invalide')
  }
  if (!isCreditOpinion(raw.avis)) throw new CreditAnalysisParseError('Réponse du modèle sans avis reconnu')
  const synthese = str(raw.synthese)
  if (!synthese) throw new CreditAnalysisParseError('Réponse du modèle sans synthèse')
  const placement = (raw.placement ?? {}) as Record<string, unknown>
  const confiance = raw.confiance
  return {
    avis: raw.avis,
    confiance: confiance === 'haute' || confiance === 'basse' ? confiance : 'moyenne',
    synthese,
    points_forts: strList(raw.points_forts),
    points_vigilance: strList(raw.points_vigilance),
    questions_client: strList(raw.questions_client),
    pieces_a_demander: strList(raw.pieces_a_demander),
    placement: { financeur_recommande: str(placement.financeur_recommande, 120), strategie: str(placement.strategie, 1200) },
  }
}

// ── Rendu (emails, récapitulatif) ────────────────────────────────────

export const eur = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
const pctLabel = (n: number | null) => (n == null ? '—' : frPct(n))

/** Lignes « libellé → valeur » des indicateurs, partagées par la fiche admin et les emails. */
export function indicatorRows(ind: CreditIndicators): { label: string; value: string }[] {
  return [
    { label: 'Montant HT', value: eur(ind.amount) },
    { label: 'Loyer retenu', value: ind.monthly == null ? '—' : `${eur(ind.monthly, 2)} / ${ind.periodicite === 'mensuelle' ? 'mois' : ind.periodicite === 'trimestrielle' ? 'trimestre' : 'an'}` },
    { label: `CA${ind.revenueSource ? ` (${ind.revenueSource}${ind.revenueYear ? ` ${ind.revenueYear}` : ''})` : ''}`, value: eur(ind.revenue) },
    { label: `Résultat net${ind.netResultSource ? ` (${ind.netResultSource})` : ''}`, value: eur(ind.netResult) },
    { label: 'Montant / CA', value: pctLabel(ind.amountToRevenuePct) },
    { label: 'Loyer annuel / CA', value: pctLabel(ind.annualRentToRevenuePct) },
    { label: 'Ancienneté', value: ind.companyAgeYears == null ? '—' : `${ind.companyAgeYears} an${ind.companyAgeYears > 1 ? 's' : ''}` },
    { label: 'Effectif', value: ind.headcount ?? '—' },
    { label: 'Actif principal', value: ind.mainFamily ?? '—' },
    { label: 'Financeurs éligibles', value: ind.eligibleLeasers.length ? ind.eligibleLeasers.join(', ') : 'aucun' },
    { label: 'Historique everlease', value: ind.previousRequests === 0 ? 'premier dossier' : `${ind.previousRequests} dossier${ind.previousRequests > 1 ? 's' : ''}${ind.refusedRequests ? `, ${ind.refusedRequests} refusé${ind.refusedRequests > 1 ? 's' : ''}` : ''}` },
  ]
}

const list = (title: string, items: string[]) =>
  items.length
    ? `<p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:16px 0 6px">${esc(title)}</p><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : ''

export type AnalysisEmailInput = {
  requestRef: string
  companyName: string
  adminUrl: string
  analysis: CreditAnalysis
  indicators: CreditIndicators
  model: string
}

/** Email interne à la soumission : la fiche d'analyse complète, avec le lien vers le back-office. */
export function emailTeamCreditAnalysis({ requestRef, companyName, adminUrl, analysis, indicators, model }: AnalysisEmailInput) {
  const avis = opinionInfo(analysis.avis).label
  const flags = indicators.flags.filter(f => f.severity !== 'info')
  return {
    subject: `[everlease] Nouveau dossier ${requestRef} · ${companyName.replace(/[\r\n]+/g, ' ')} · ${eur(indicators.amount)} · ${avis}`,
    html: `
<div style="font-family:Inter,system-ui,sans-serif;max-width:620px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Analyse crédit · ${esc(companyName)}</p>
    <p style="color:#6B6F76;margin:4px 0 0">Réf. ${esc(requestRef)} · ${esc(indicators.financingType)} · ${eur(indicators.amount)} sur ${indicators.duration ?? '—'} mois</p>
  </div>
  <div style="background:#F2F3F4;border:1px solid #DCDEE1;border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 8px">Avis · confiance ${esc(analysis.confiance)}</p>
    <p style="font-size:18px;font-weight:600;margin:0 0 12px">${esc(avis)}</p>
    <p style="font-size:13px;line-height:1.55;margin:0;white-space:pre-line">${esc(analysis.synthese)}</p>
  </div>
  ${flags.length ? `<div style="border-left:3px solid #B42318;padding:4px 0 4px 16px;margin-bottom:24px"><p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:0 0 6px">Alertes</p>${flags.map(f => `<p style="font-size:13px;margin:0 0 4px">${esc(f.label)}</p>`).join('')}</div>` : ''}
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    ${indicatorRows(indicators).map(r => `<tr><td style="padding:5px 0;color:#6B6F76;font-size:13px;border-bottom:1px solid #DCDEE1">${esc(r.label)}</td><td style="padding:5px 0;text-align:right;font-weight:600;font-size:13px;border-bottom:1px solid #DCDEE1">${esc(r.value)}</td></tr>`).join('')}
  </table>
  ${list('Points forts', analysis.points_forts)}
  ${list('Points de vigilance', analysis.points_vigilance)}
  ${list('Questions à poser au client', analysis.questions_client)}
  ${list('Pièces à demander', analysis.pieces_a_demander)}
  ${analysis.placement.strategie || analysis.placement.financeur_recommande ? `<p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6F76;margin:16px 0 6px">Placement</p><p style="font-size:13px;line-height:1.5;margin:0">${analysis.placement.financeur_recommande ? `<strong>${esc(analysis.placement.financeur_recommande)}</strong> · ` : ''}${esc(analysis.placement.strategie ?? '')}</p>` : ''}
  <p style="margin:24px 0"><a href="${esc(adminUrl)}" style="display:inline-block;padding:10px 20px;background:#141517;color:#fff;border-radius:999px;text-decoration:none;font-size:13px;font-weight:500">Ouvrir le dossier</a></p>
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Analyse générée automatiquement (${esc(model)}) à partir des données du dossier et du registre des entreprises. À vérifier par un conseiller avant toute décision.</p>
</div>`,
  }
}

// ── Récapitulatif des demandes reçues ────────────────────────────────

export type RecapItem = {
  id: string
  ref: string
  companyName: string
  siren: string | null
  status: string | null
  amount: number | null
  duration: number | null
  financingType: string
  createdAt: string
  /** null : analyse absente (échec ou pas encore faite) */
  avis: CreditOpinion | null
  synthese: string | null
  flags: string[]
  leaserName: string | null
  monthly: number | null
}

export type Recap = {
  since: string
  until: string
  items: RecapItem[]
  /** Dossiers du périmètre analysés pendant ce passage */
  analyzedNow: number
  /** Dossiers restés sans analyse après ce passage */
  missing: number
}

export function recapSubject(recap: Recap): string {
  const n = recap.items.length
  const total = recap.items.reduce((s, i) => s + (i.amount ?? 0), 0)
  return `[everlease] Récap demandes · ${n} dossier${n > 1 ? 's' : ''} reçu${n > 1 ? 's' : ''} · ${eur(total)}`
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

/** Email de récapitulatif : compteurs puis une entrée par dossier reçu, avis en tête. */
export function recapHtml(recap: Recap, adminBase: string): string {
  const byOpinion = CREDIT_OPINIONS.map(o => ({ o, n: recap.items.filter(i => i.avis === o).length })).filter(x => x.n)
  const total = recap.items.reduce((s, i) => s + (i.amount ?? 0), 0)
  const rows = recap.items.map(i => `
    <div style="border:1px solid #DCDEE1;border-radius:16px;padding:18px 20px;margin-bottom:12px">
      <p style="margin:0 0 4px;font-size:14px"><strong>${esc(i.companyName)}</strong> <span style="color:#6B6F76">· ${esc(i.ref)} · ${fmtDay(i.createdAt)}</span></p>
      <p style="margin:0 0 8px;font-size:13px;color:#6B6F76">${esc(i.financingType)} · ${eur(i.amount)} sur ${i.duration ?? '—'} mois · ${esc(requestStatusInfo(i.status).label)}${i.leaserName ? ` · ${esc(i.leaserName)} ${eur(i.monthly, 2)}/mois` : ''}</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>${esc(i.avis ? opinionInfo(i.avis).label : 'Analyse indisponible')}</strong></p>
      ${i.synthese ? `<p style="margin:0 0 6px;font-size:13px;line-height:1.5">${esc(i.synthese)}</p>` : ''}
      ${i.flags.length ? `<p style="margin:0 0 8px;font-size:12px;color:#B42318">${i.flags.map(esc).join(' · ')}</p>` : ''}
      <a href="${esc(`${adminBase}/admin/dossiers/${i.id}`)}" style="font-size:12px;color:#141517">Ouvrir le dossier</a>
    </div>`).join('')
  return `
<div style="font-family:Inter,system-ui,sans-serif;max-width:620px;margin:0 auto;color:#141517">
  <div style="padding:32px 0 16px">
    <p style="font-size:20px;font-weight:600;margin:0">Demandes reçues du ${fmtDay(recap.since)} au ${fmtDay(recap.until)}</p>
    <p style="color:#6B6F76;margin:4px 0 0">${recap.items.length} dossier${recap.items.length > 1 ? 's' : ''} · ${eur(total)} HT${byOpinion.length ? ` · ${byOpinion.map(x => `${x.n} ${opinionInfo(x.o).label.toLowerCase()}`).join(', ')}` : ''}</p>
  </div>
  ${recap.items.length === 0 ? '<p style="font-size:13px;color:#6B6F76">Aucun dossier soumis sur la période.</p>' : rows}
  ${recap.missing ? `<p style="font-size:12px;color:#6B6F76">${recap.missing} dossier${recap.missing > 1 ? 's' : ''} sans analyse (reprise au prochain passage ou depuis la fiche).</p>` : ''}
  <hr style="border:none;border-top:1px solid #DCDEE1;margin:24px 0">
  <p style="font-size:11px;color:#6B6F76">Récapitulatif automatique de l'agent analyste crédit everlease. Avis indicatifs, à vérifier par un conseiller.</p>
</div>`
}

// Attribution des leads : d'où vient un visiteur (lien tagué utm_*, site référent, accès direct), retenu à sa
// première visite dans un cookie propre au site, puis copié sur sa société à l'inscription ou au formulaire expert.
// Sans dépendance serveur : testable. Lecture et écriture du cookie : proxy.ts et lib/attribution-store.ts.

export const ATTRIBUTION_COOKIE = 'ev_src'
export const ATTRIBUTION_MAX_AGE = 90 * 24 * 3600

export type Attribution = {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  /** Domaine du site d'où vient le visiteur (jamais l'URL complète) */
  referrer: string | null
  /** Première page vue (chemin seul, sans paramètres) */
  landing: string
  first_seen: string
}

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

// Valeur courte et sans caractère de contrôle : elle finit dans le CRM et dans un cookie
const clean = (v: string | null | undefined, max = 100) => {
  const s = (v ?? '').replace(/[\u0000-\u001f<>"]/g, '').trim().toLowerCase().slice(0, max)
  return s || null
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

const ownHost = (host: string, own: string) => host === own || host.endsWith(`.${own}`)

/** Source de la visite. Navigation interne (même site) : null, rien à retenir. */
export function readAttribution(url: URL, referrerHeader: string | null, siteHost: string, now = new Date()): Attribution | null {
  const own = siteHost.replace(/^www\./, '').toLowerCase()
  const ref = hostOf(referrerHeader)
  const utm = Object.fromEntries(UTM.map(k => [k, clean(url.searchParams.get(k))])) as Pick<Attribution, (typeof UTM)[number]>
  const tagged = UTM.some(k => utm[k])
  if (!tagged && ref && ownHost(ref, own)) return null
  return {
    ...utm,
    referrer: ref && !ownHost(ref, own) ? ref : null,
    landing: url.pathname.slice(0, 200) || '/',
    first_seen: now.toISOString(),
  }
}

export const isDirect = (a: Attribution) => !a.referrer && !UTM.some(k => a[k])

/** Première source retenue ; un accès direct cède la place à la première vraie source qui suit. */
export function shouldReplace(current: Attribution | null, incoming: Attribution | null): boolean {
  if (!incoming) return false
  if (!current) return true
  return isDirect(current) && !isDirect(incoming)
}

export function encodeAttribution(a: Attribution): string {
  return Buffer.from(JSON.stringify(a)).toString('base64url')
}

/** Cookie illisible ou trafiqué : ignoré. Toutes les valeurs repassent par le nettoyage. */
export function decodeAttribution(raw: string | null | undefined): Attribution | null {
  if (!raw || raw.length > 2000) return null
  try {
    const o = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<string, unknown>
    const s = (k: string, max?: number) => clean(typeof o[k] === 'string' ? (o[k] as string) : null, max)
    const seen = typeof o.first_seen === 'string' && !Number.isNaN(Date.parse(o.first_seen)) ? new Date(o.first_seen).toISOString() : null
    if (!seen) return null
    return {
      utm_source: s('utm_source'), utm_medium: s('utm_medium'), utm_campaign: s('utm_campaign'),
      utm_term: s('utm_term'), utm_content: s('utm_content'),
      referrer: s('referrer'),
      landing: (typeof o.landing === 'string' && o.landing.startsWith('/') ? o.landing : '/').slice(0, 200),
      first_seen: seen,
    }
  } catch {
    return null
  }
}

// Sites connus → canal lisible dans le CRM
const SEARCH = ['google.', 'bing.com', 'duckduckgo.com', 'qwant.com', 'ecosia.org', 'yahoo.', 'search.brave.com']
const SOCIAL: [string, string][] = [['linkedin.com', 'LinkedIn'], ['lnkd.in', 'LinkedIn'], ['facebook.com', 'Facebook'], ['instagram.com', 'Instagram'], ['x.com', 'X'], ['t.co', 'X'], ['youtube.com', 'YouTube']]
const AI = ['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com']

/** Canal en clair pour le CRM : « Lemlist · chr-novembre », « Google (naturel) », « LinkedIn », « Accès direct »… */
export function channelLabel(a: Attribution): string {
  if (a.utm_source) {
    const source = a.utm_source.charAt(0).toUpperCase() + a.utm_source.slice(1)
    return a.utm_campaign ? `${source} · ${a.utm_campaign}` : source
  }
  const ref = a.referrer
  if (!ref) return 'Accès direct'
  if (AI.some(d => ref === d || ref.endsWith(`.${d}`))) return `IA (${ref})`
  if (SEARCH.some(d => ref.includes(d))) return `${ref.startsWith('google.') ? 'Google' : ref} (naturel)`
  const social = SOCIAL.find(([d]) => ref === d || ref.endsWith(`.${d}`))
  if (social) return social[1]
  return `Site référent (${ref})`
}

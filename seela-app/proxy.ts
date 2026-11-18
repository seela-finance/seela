import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, decodeAttribution, encodeAttribution, readAttribution, shouldReplace } from '@/lib/attribution'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = ['/app', '/admin'].some(p => pathname === p || pathname.startsWith(`${p}/`))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/app/dashboard'
    return NextResponse.redirect(url)
  }

  rememberSource(request, supabaseResponse)
  return supabaseResponse
}

// Attribution des leads (lib/attribution.ts) : première source du visiteur, retenue 90 jours sur les pages
// publiques et de l'app (pas l'API ni le back-office), copiée sur sa société à l'inscription.
function rememberSource(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl
  if (request.method !== 'GET' || pathname.startsWith('/api') || pathname.startsWith('/admin')) return
  if (!(request.headers.get('accept') ?? '').includes('text/html')) return
  const incoming = readAttribution(request.nextUrl, request.headers.get('referer'), request.nextUrl.hostname)
  const current = decodeAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value)
  if (!shouldReplace(current, incoming) || !incoming) return
  response.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(incoming), {
    maxAge: ATTRIBUTION_MAX_AGE, httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/',
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

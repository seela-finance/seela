import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { afterConfirmPath } from '@/lib/auth-redirect'
import { loadAccount, onboardingDone } from '@/lib/account'

// Retour du lien de confirmation d'email : ouvre la session, puis onboarding ou tableau de bord.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      return NextResponse.redirect(`${origin}${afterConfirmPath(onboardingDone(await loadAccount(supabase, data.user.id)))}`)
    }
  }

  // Lien expiré ou ouvert dans un autre navigateur : l'email peut être confirmé quand même (message sur /auth)
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`)
}

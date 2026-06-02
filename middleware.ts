import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  const { pathname } = request.nextUrl

  // Handle auth callback — process token_hash or code and redirect to dashboard
  if (pathname === '/auth/callback' || pathname === '/auth/confirm') {
    const token_hash = request.nextUrl.searchParams.get('token_hash')
    const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null
    const code = request.nextUrl.searchParams.get('code')
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard'

    let sessionError: string | null = null

    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash })
      if (!error) {
        const url = request.nextUrl.clone()
        url.pathname = next
        url.search = ''
        const redirect = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c))
        return redirect
      }
      sessionError = error.message
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const url = request.nextUrl.clone()
        url.pathname = next
        url.search = ''
        const redirect = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c))
        return redirect
      }
      sessionError = error?.message ?? 'Unknown error'
    }

    // Auth failed — redirect to home with error
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = `?message=${encodeURIComponent(sessionError ?? 'auth-error')}`
    return NextResponse.redirect(url)
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected pages
  const protectedPaths = ['/dashboard', '/matches', '/leagues', '/profile', '/admin']
  if (!user && protectedPaths.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from the login page
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

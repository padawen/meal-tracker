import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/lib/supabase/database.types'
import { sanitizeNextPath } from '@/lib/utils'

function isProtectedRoute(pathname: string) {
  return pathname === '/' || pathname.startsWith('/statistics') || pathname.startsWith('/admin')
}

function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin')
}

function isLoginRoute(pathname: string) {
  return pathname === '/login'
}

function isPendingApprovalRoute(pathname: string) {
  return pathname === '/pending-approval'
}

function withSupabaseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  for (const name of ['cache-control', 'expires', 'pragma', 'server-timing']) {
    const value = source.headers.get(name)
    if (value) target.headers.set(name, value)
  }

  return target
}

function loginRedirect(request: NextRequest, supabaseResponse: NextResponse) {
  const redirectUrl = new URL('/login', request.url)
  const nextPath = sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`)

  if (nextPath && nextPath !== '/login') {
    redirectUrl.searchParams.set('next', nextPath)
  }

  return withSupabaseCookies(NextResponse.redirect(redirectUrl), supabaseResponse)
}

export async function proxy(request: NextRequest) {
  const start = performance.now()
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>, headers: Record<string, string>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => supabaseResponse.headers.set(name, value))
      },
    },
  })

  const pathname = request.nextUrl.pathname
  const shouldCheckProfile =
    isProtectedRoute(pathname) || isLoginRoute(pathname) || isPendingApprovalRoute(pathname)

  if (!shouldCheckProfile) {
    return supabaseResponse
  }

  const {
    data,
    error: claimsError,
  } = await supabase.auth.getClaims()
  const authDuration = performance.now() - start
  const userId = data?.claims?.sub
  supabaseResponse.headers.set('Server-Timing', `auth;dur=${authDuration.toFixed(1)}`)

  if (claimsError || typeof userId !== 'string' || !userId) {
    if (isProtectedRoute(pathname) || isPendingApprovalRoute(pathname)) {
      return loginRedirect(request, supabaseResponse)
    }

    return supabaseResponse
  }

  const profileStart = performance.now()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_admin, is_approved')
    .eq('id', userId)
    .maybeSingle()
  supabaseResponse.headers.set('Server-Timing', `auth;dur=${authDuration.toFixed(1)}, profile;dur=${(performance.now() - profileStart).toFixed(1)}`)

  if (profileError || !profile) {
    return loginRedirect(request, supabaseResponse)
  }

  const isApproved = profile.is_admin || profile.is_approved

  if (isLoginRoute(pathname)) {
    const redirectUrl = new URL(isApproved ? '/' : '/pending-approval', request.url)
    return withSupabaseCookies(NextResponse.redirect(redirectUrl), supabaseResponse)
  }

  if (isPendingApprovalRoute(pathname)) {
    if (isApproved) {
      return withSupabaseCookies(NextResponse.redirect(new URL('/', request.url)), supabaseResponse)
    }

    return supabaseResponse
  }

  if (!isApproved) {
    return withSupabaseCookies(NextResponse.redirect(new URL('/pending-approval', request.url)), supabaseResponse)
  }

  if (isAdminRoute(pathname) && !profile.is_admin) {
    return withSupabaseCookies(NextResponse.redirect(new URL('/', request.url)), supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/login', '/statistics/:path*', '/admin/:path*', '/pending-approval'],
}

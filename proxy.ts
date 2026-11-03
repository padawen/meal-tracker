import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/lib/supabase/database.types'
import { sanitizeNextPath } from '@/lib/utils'

// These identify module reuse, not a platform cold start. No auth data is shared.
const moduleStartedAt = performance.now()
const runtimeInstance = crypto.randomUUID().slice(0, 8)
let runtimeRequests = 0
let runtimeProfileRequests = 0

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
  const requestOrdinal = ++runtimeRequests
  let profileStart: number | null = null
  const profileAttempts: Array<{ start: number; end: number; ordinal: number; upstream?: number }> = []
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    global: {
      fetch: async (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
        if (profileStart === null || url.pathname !== '/rest/v1/profiles') {
          return fetch(input, init)
        }

        const attempt = { start: performance.now(), end: 0, ordinal: ++runtimeProfileRequests, upstream: undefined as number | undefined }
        profileAttempts.push(attempt)
        try {
          const response = await fetch(input, init)
          const upstream = response.headers.get('x-envoy-upstream-service-time')
          if (upstream?.trim() && Number.isFinite(Number(upstream)) && Number(upstream) >= 0) {
            attempt.upstream = Number(upstream)
          }
          return response
        } finally {
          attempt.end = performance.now()
        }
      },
    },
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

  profileStart = performance.now()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_admin, is_approved')
    .eq('id', userId)
    .maybeSingle()
  const profileEnd = performance.now()
  const metrics = [`auth;dur=${authDuration.toFixed(1)}`, `profile;dur=${(profileEnd - profileStart).toFixed(1)}`]
  const firstAttempt = profileAttempts[0]
  if (firstAttempt) {
    const lastAttempt = profileAttempts[profileAttempts.length - 1]
    const httpDuration = profileAttempts.reduce((total, attempt) => total + attempt.end - attempt.start, 0)
    const retryWait = profileAttempts.reduce((total, attempt, index) => total + (index ? attempt.start - profileAttempts[index - 1].end : 0), 0)
    metrics.push(
      `profile_prepare;dur=${(firstAttempt.start - profileStart).toFixed(1)}`,
      `profile_http;dur=${httpDuration.toFixed(1)}`,
      `profile_finish;dur=${(profileEnd - lastAttempt.end).toFixed(1)}`,
      // Includes processing between retries as well as the SDK backoff.
      `profile_retry_wait;dur=${retryWait.toFixed(1)}`,
      `profile_attempts;desc="${profileAttempts.length}"`,
      `runtime_profile;desc="${firstAttempt.ordinal}"`,
    )
    // Envoy reports upstream service + network time, not SQL execution time.
    if (profileAttempts.every((attempt) => attempt.upstream !== undefined)) {
      metrics.push(`profile_upstream;dur=${profileAttempts.reduce((total, attempt) => total + attempt.upstream!, 0).toFixed(1)}`)
    }
  }
  const region = process.env.VERCEL_REGION ?? 'unknown'
  metrics.push(
    `runtime_region;desc="${/^[a-z0-9-]+$/i.test(region) ? region : 'unknown'}"`,
    `runtime_instance;desc="${runtimeInstance}"`,
    `runtime_request;desc="${requestOrdinal}"`,
    `module_age;dur=${(start - moduleStartedAt).toFixed(1)}`,
  )
  supabaseResponse.headers.set('Server-Timing', metrics.join(', '))

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

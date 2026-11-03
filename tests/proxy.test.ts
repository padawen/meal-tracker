import { NextRequest } from 'next/server'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { proxy } from '@/proxy'

const mock = vi.hoisted(() => ({
  claims: vi.fn(), user: vi.fn(), profile: vi.fn(),
  fetch: undefined as typeof fetch | undefined,
  cookies: null as null | { setAll: (cookies: { name: string; value: string; options?: object }[], headers?: Record<string, string>) => void },
}))
vi.mock('@/lib/env', () => ({ publicEnv: { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'public' } }))
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: typeof mock.cookies; global?: { fetch: typeof fetch } }) => {
  mock.cookies = options.cookies
  mock.fetch = options.global?.fetch
  return { auth: { getClaims: mock.claims, getUser: mock.user }, from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: mock.profile }) }),
  }) }
} }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
beforeEach(() => {
  mock.claims.mockReset().mockResolvedValue({ data: { claims: { sub: 'owner' } }, error: null })
  mock.user.mockReset().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null })
  mock.profile.mockReset().mockResolvedValue({ data: { id: 'owner', is_admin: false, is_approved: true }, error: null })
})
const request = (path = '/statistics') => new NextRequest(`https://app.example${path}`)

it('verifies claims without a getUser round trip and exposes anonymous timing metrics', async () => {
  const response = await proxy(request())
  expect(mock.claims).toHaveBeenCalledTimes(1)
  expect(mock.user).not.toHaveBeenCalled()
  expect(response.status).toBe(200)
  expect(response.headers.get('Server-Timing')).toMatch(/auth;dur=\d+(\.\d+)?, profile;dur=\d+(\.\d+)?/)
  expect(response.headers.get('Server-Timing')).not.toContain('owner')
})
it('rejects invalid claims before looking up the profile', async () => {
  mock.claims.mockResolvedValue({ data: null, error: new Error('invalid token') })
  const response = await proxy(request())
  expect(response.headers.get('location')).toBe('https://app.example/login?next=%2Fstatistics')
  expect(mock.profile).not.toHaveBeenCalled()
})
it('checks approval and admin access freshly on every request', async () => {
  expect((await proxy(request('/admin'))).headers.get('location')).toBe('https://app.example/')
  mock.profile.mockResolvedValue({ data: { id: 'owner', is_admin: false, is_approved: false }, error: null })
  expect((await proxy(request())).headers.get('location')).toBe('https://app.example/pending-approval')
  expect(mock.profile).toHaveBeenCalledTimes(2)
})
it('preserves refreshed auth cookies and no-store headers on redirects', async () => {
  mock.claims.mockImplementation(async () => {
    mock.cookies!.setAll([{ name: 'session', value: 'refreshed', options: { httpOnly: true } }], { 'Cache-Control': 'private, no-store' })
    return { data: { claims: { sub: 'owner' } }, error: null }
  })
  const response = await proxy(request('/admin'))
  expect(response.cookies.get('session')?.value).toBe('refreshed')
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(response.headers.get('Server-Timing')).toContain('auth;dur=')
})

it('separates profile preparation, HTTP and response processing and identifies module reuse', async () => {
  let clock = performance.now()
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  vi.stubEnv('VERCEL_REGION', 'lhr1')
  mock.claims.mockImplementation(async () => {
    clock += 5
    return { data: { claims: { sub: 'owner' } }, error: null }
  })
  vi.stubGlobal('fetch', vi.fn(async () => {
    clock += 60
    return new Response('{}', { headers: { 'x-envoy-upstream-service-time': '41' } })
  }))
  mock.profile.mockImplementation(async () => {
    clock += 3
    // Without instrumentation, perform the same request through the native boundary.
    await (mock.fetch ?? fetch)('https://test.supabase.co/rest/v1/profiles?id=eq.owner')
    clock += 2
    return { data: { id: 'owner', is_admin: false, is_approved: true }, error: null }
  })

  const first = (await proxy(request())).headers.get('Server-Timing')!
  const second = (await proxy(request('/'))).headers.get('Server-Timing')!
  expect(first).toContain('auth;dur=5.0, profile;dur=65.0')
  expect(first).toContain('profile_prepare;dur=3.0')
  expect(first).toContain('profile_http;dur=60.0')
  expect(first).toContain('profile_finish;dur=2.0')
  expect(first).toContain('profile_upstream;dur=41.0')
  expect(first).toContain('profile_attempts;desc="1"')
  expect(first).toContain('runtime_region;desc="lhr1"')
  expect(first).toMatch(/module_age;dur=\d+(\.\d+)?/)
  const instance = /runtime_instance;desc="([a-f0-9-]+)"/
  expect(first).toMatch(instance)
  expect(second.match(instance)?.[1]).toBe(first.match(instance)?.[1])
  const ordinal = /runtime_request;desc="(\d+)"/
  expect(Number(second.match(ordinal)?.[1])).toBe(Number(first.match(ordinal)?.[1]) + 1)
  const httpOrdinal = /runtime_profile;desc="(\d+)"/
  expect(Number(second.match(httpOrdinal)?.[1])).toBe(Number(first.match(httpOrdinal)?.[1]) + 1)
  expect(first).not.toMatch(/owner|https|public/)
})

it('accounts for failed attempts and retry waits without inventing missing upstream timings', async () => {
  let clock = performance.now()
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  vi.stubGlobal('fetch', vi.fn()
    .mockImplementationOnce(async () => { clock += 20; throw new TypeError('fetch failed') })
    .mockImplementationOnce(async () => {
      clock += 60
      return new Response('{}', { headers: { 'x-envoy-upstream-service-time': 'invalid' } })
    }))
  mock.profile.mockImplementation(async () => {
    clock += 3
    try {
      await (mock.fetch ?? fetch)('https://test.supabase.co/rest/v1/profiles')
    } catch {
      clock += 100
      await (mock.fetch ?? fetch)('https://test.supabase.co/rest/v1/profiles')
    }
    clock += 2
    return { data: null, error: new Error('profile unavailable') }
  })
  const response = await proxy(request())
  expect(response.status).toBe(307)
  const timing = response.headers.get('Server-Timing')!
  expect(timing).toContain('profile;dur=185.0')
  expect(timing).toContain('profile_http;dur=80.0')
  expect(timing).toContain('profile_retry_wait;dur=100.0')
  expect(timing).toContain('profile_attempts;desc="2"')
  expect(timing).not.toContain('profile_upstream')
})

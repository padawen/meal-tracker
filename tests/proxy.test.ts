import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { proxy } from '@/proxy'

const mock = vi.hoisted(() => ({
  claims: vi.fn(), user: vi.fn(), profile: vi.fn(),
  cookies: null as null | { setAll: (cookies: { name: string; value: string; options?: object }[], headers?: Record<string, string>) => void },
}))
vi.mock('@/lib/env', () => ({ publicEnv: { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'public' } }))
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: typeof mock.cookies }) => {
  mock.cookies = options.cookies
  return { auth: { getClaims: mock.claims, getUser: mock.user }, from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: mock.profile }) }),
  }) }
} }))
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

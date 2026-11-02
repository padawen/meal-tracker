import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthSessionProfile } from '@/components/auth/useAuthSessionProfile'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { TopBar } from '@/components/layout/TopBar'

const mock = vi.hoisted(() => ({
  listeners: new Set<(event: string, session: unknown) => void>(),
  replace: vi.fn(), profile: vi.fn(), update: vi.fn(), channels: [] as { topic: string; callback?: () => void; subscribed: boolean }[],
  remove: vi.fn(), initial: null as unknown,
  save: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
const router = { replace: mock.replace }
vi.mock('@/app/actions/user-actions', () => ({ updateProfileAction: mock.save }))
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  auth: {
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
      mock.listeners.add(callback)
      queueMicrotask(() => { if (mock.listeners.has(callback)) callback('INITIAL_SESSION', mock.initial) })
      return { data: { subscription: { unsubscribe: () => mock.listeners.delete(callback) } } }
    },
    signOut: vi.fn(async () => { for (const callback of mock.listeners) callback('SIGNED_OUT', null) }),
  },
  from: () => ({
    select: () => ({ eq: (_key: string, id: string) => ({ maybeSingle: () => mock.profile(id) }) }),
    update: (value: unknown) => ({ eq: (...args: unknown[]) => mock.update(value, ...args) }),
  }),
  channel: (topic: string) => {
    const channel = { topic, subscribed: false, callback: undefined as (() => void) | undefined,
      on: (_event: string, _filter: unknown, callback: () => void) => {
        if (channel.subscribed) throw new Error('cannot add callbacks after subscribe')
        channel.callback = callback
        return channel
      }, subscribe: () => { channel.subscribed = true; return channel },
    }
    mock.channels.push(channel)
    return channel
  },
  removeChannel: mock.remove,
} }))
const profile = (id: string) => ({ id, email: `${id}@test.invalid`, full_name: id, avatar_url: 'same-avatar', is_admin: false, is_approved: true })
const session = (id: string) => ({ user: { id, user_metadata: { avatar_url: 'same-avatar' } } })
const emit = (event: string, value: unknown) => act(() => { for (const callback of mock.listeners) callback(event, value) })

beforeEach(() => {
  mock.listeners.clear(); mock.channels.length = 0
  mock.initial = session('a')
  mock.profile.mockReset().mockImplementation(async (id: string) => ({ data: profile(id), error: null }))
  mock.update.mockReset().mockResolvedValue({ error: null })
  mock.remove.mockReset().mockImplementation(() => new Promise(() => {}))
  mock.replace.mockClear()
  mock.save.mockReset().mockResolvedValue({ success: true })
})
afterEach(cleanup)
describe('auth profile lifecycle', () => {
  it('initializes once in Strict Mode and ignores repeated same-user auth events', async () => {
    const { result } = renderHook(() => useAuthSessionProfile(), { wrapper: StrictMode })
    await waitFor(() => expect(result.current.profile?.id).toBe('a'))
    const count = mock.channels.length
    emit('SIGNED_IN', session('a')); emit('TOKEN_REFRESHED', session('a'))
    expect(mock.channels).toHaveLength(count)
    expect(mock.profile).toHaveBeenCalledTimes(1)
    expect(mock.update).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    mock.profile.mockResolvedValue({ data: { ...profile('a'), is_admin: true } })
    act(() => mock.channels[0].callback?.())
    await waitFor(() => expect(result.current.profile?.is_admin).toBe(true))
  })
  it('owns unique channels across remounts while removal is still pending', async () => {
    const first = renderHook(() => useAuthSessionProfile())
    await waitFor(() => expect(first.result.current.profile?.id).toBe('a'))
    first.unmount()
    const second = renderHook(() => useAuthSessionProfile())
    await waitFor(() => expect(second.result.current.profile?.id).toBe('a'))
    expect(new Set(mock.channels.map((channel) => channel.topic)).size).toBe(2)
    expect(mock.remove).toHaveBeenCalledTimes(1)
  })
  it('ignores an old user request that completes after switching users', async () => {
    let resolveOld!: (value: unknown) => void
    mock.profile.mockImplementation((id: string) => id === 'a' ? new Promise((done) => { resolveOld = done }) : Promise.resolve({ data: profile(id) }))
    const { result } = renderHook(() => useAuthSessionProfile())
    await waitFor(() => expect(mock.profile).toHaveBeenCalledWith('a'))
    emit('SIGNED_IN', session('b'))
    await waitFor(() => expect(result.current.profile?.id).toBe('b'))
    await act(async () => resolveOld({ data: profile('a') }))
    expect(result.current.profile?.id).toBe('b')
  })
})

it('discards a pending profile response after SIGNED_OUT', async () => {
  let resolveOld!: (value: unknown) => void
  mock.profile.mockImplementation(() => new Promise((done) => { resolveOld = done }))
  const { result } = renderHook(() => useAuthSessionProfile())
  await waitFor(() => expect(mock.profile).toHaveBeenCalled())
  emit('SIGNED_OUT', null)
  await act(async () => resolveOld({ data: profile('a') }))
  expect(result.current.user).toBeNull()
  expect(result.current.profile).toBeNull()
  expect(result.current.loading).toBe(false)
})

it('keeps the profile draft and retry UI when Realtime overlaps a failed post-save refresh', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<AuthGuard><TopBar currentPage="kaja" isAdmin={false} /></AuthGuard>)
  fireEvent.keyDown(await screen.findByRole('button', { name: /Szia,/ }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Profil beállítások' }))
  fireEvent.change(screen.getByLabelText('Becenév / Teljes név'), { target: { value: 'Új név' } })
  let resolveFailure!: (value: unknown) => void
  const failedRefresh = new Promise(resolve => { resolveFailure = resolve })
  mock.profile.mockImplementation(() => failedRefresh)
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
  await waitFor(() => expect(mock.profile).toHaveBeenCalledTimes(2))
  act(() => mock.channels[0].callback?.())
  await act(async () => resolveFailure({ data: null, error: new Error('network') }))
  expect((await screen.findByRole('alert')).textContent).toContain('A nevet elmentettük')
  expect(mock.replace).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Becenév / Teljes név') as HTMLInputElement).value).toBe('Új név')
  mock.profile.mockResolvedValue({ data: { ...profile('a'), full_name: 'Új név' }, error: null })
  fireEvent.click(await screen.findByRole('button', { name: 'Frissítés újra' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(mock.save).toHaveBeenCalledTimes(1)
})

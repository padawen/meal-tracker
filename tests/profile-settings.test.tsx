import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TopBar } from '@/components/layout/TopBar'

const mock = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/actions/user-actions', () => ({ updateProfileAction: mock.save }))
vi.mock('@/components/auth/AuthGuard', () => ({ useAuth: () => ({
  user: { id: 'owner', email: 'test@example.invalid', user_metadata: {} },
  profile: { full_name: 'Eredeti név', avatar_url: null },
  refreshProfile: mock.refresh, signOut: vi.fn(),
}) }))

afterEach(cleanup)
beforeEach(() => {
  mock.save.mockReset().mockResolvedValue({ success: true })
  mock.refresh.mockReset().mockResolvedValue(undefined)
})
async function openSettings() {
  render(<TopBar currentPage="kaja" isAdmin={false} />)
  fireEvent.keyDown(screen.getByRole('button', { name: /Szia,/ }), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Profil beállítások' }))
  fireEvent.change(screen.getByLabelText('Becenév / Teljes név'), { target: { value: 'Új név' } })
}

it('keeps the nickname draft visible after a failed save and lets the user retry', async () => {
  mock.save.mockRejectedValueOnce(new Error('network failure'))
  await openSettings()
  fireEvent.click(await screen.findByRole('button', { name: 'Mentés' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Nem sikerült menteni')
  expect((screen.getByLabelText('Becenév / Teljes név') as HTMLInputElement).value).toBe('Új név')
  fireEvent.click(await screen.findByRole('button', { name: 'Mentés' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(mock.save).toHaveBeenCalledTimes(2)
  expect(mock.save).toHaveBeenLastCalledWith('Új név')
})

it('reports a successful save with failed refresh and retries only the refresh', async () => {
  mock.refresh.mockRejectedValueOnce(new Error('network failure'))
  await openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
  expect((await screen.findByRole('alert')).textContent).toContain('A nevet elmentettük')
  fireEvent.click(await screen.findByRole('button', { name: 'Frissítés újra' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(mock.save).toHaveBeenCalledTimes(1)
  expect(mock.refresh).toHaveBeenCalledTimes(2)
})

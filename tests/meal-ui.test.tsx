import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MealOverviewCards } from '@/components/meal-table/MealOverviewCards'
import { calculatePeriodStats } from '@/lib/stats-utils'
import { DayModal } from '@/components/meal-table/DayModal'
import type { MealDayData } from '@/lib/meal-domain'

vi.mock('@/components/auth/AuthGuard', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('@/components/meal-table/useMealImage', () => ({
  useMealImage: (id?: string) => ({ status: id ? 'ready' : 'idle', url: id ? `photo-${id}` : undefined, retry: vi.fn() }),
}))
vi.mock('@/components/meal-table/MealPhoto', () => ({ MealPhoto: ({ recordId }: { recordId: string }) => <span>{`Photo ${recordId}`}</span> }))
const first: MealDayData = { date: new Date(2026, 10, 2), recordId: 'first', status: 'volt', hasImage: true,
  food: 'Első étel', recordedByUserId: 'owner', team: 'A' }
const second: MealDayData = { date: new Date(2026, 9, 31), recordId: 'second', status: 'volt', hasImage: true,
  food: 'Második étel', recordedByUserId: 'owner', team: 'B' }
const props = () => ({ onClose: vi.fn(), onSave: vi.fn(), canMovePrevious: true, canMoveNext: true })

describe('paging inside an open meal dialog', () => {
  it('keeps the dialog and sheet mounted, preserves focus, and resets the unsaved vote', () => {
    const handlers = props()
    const { rerender, unmount } = render(<DayModal day={first} {...handlers} />)
    const dialog = screen.getByRole('dialog')
    const sheet = dialog.lastElementChild
    const next = screen.getByRole('button', { name: 'Következő kép' })
    next.focus()
    fireEvent.click(screen.getByRole('button', { name: '4 csillag' }))
    expect((screen.getByRole('button', { name: 'Szavazás' }) as HTMLButtonElement).disabled).toBe(false)
    rerender(<DayModal day={second} {...handlers} />)
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(dialog.lastElementChild).toBe(sheet)
    expect(document.activeElement).toBe(next)
    expect(document.body.style.overflow).toBe('hidden')
    expect((screen.getByRole('button', { name: 'Szavazás' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('heading', { name: 'Második étel' })).toBeTruthy()
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('edits and saves the selected meal and its cached photo after paging', () => {
    const handlers = props()
    const { rerender } = render(<DayModal day={first} {...handlers} />)
    fireEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    fireEvent.change(screen.getByLabelText('Mit ettünk?'), { target: { value: 'El nem mentett változás' } })
    rerender(<DayModal day={second} {...handlers} />)
    expect(screen.getByRole('heading', { name: 'Második étel' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    expect((screen.getByLabelText('Mit ettünk?') as HTMLInputElement).value).toBe('Második étel')
    fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
    expect(handlers.onSave).toHaveBeenCalledWith(second, true, 'Második étel', 'B', 'photo-second')
  })

})

describe('summary loading UX', () => {
  it('does not display a false completed diary while its full range is unknown', () => {
    const ready = { status: 'ready' as const, retry: vi.fn() }
    const waiting = { status: 'loading' as const, retry: vi.fn() }
    const stats = calculatePeriodStats([], new Date(2026, 10, 2))
    const props = { allRecords: [], today: new Date(2026, 10, 2), weekStats: stats, monthStats: stats,
      totalEmptyDays: 0, weekState: ready, monthState: waiting, missingState: waiting }
    const { rerender } = render(<MealOverviewCards {...props} />)
    expect(screen.queryByText('Minden kitöltve!')).toBeNull()
    expect(screen.getByText('Ez a hét')).toBeTruthy()
    expect(screen.queryByText('Ez a hónap')).toBeNull()
    rerender(<MealOverviewCards {...props} monthState={ready} missingState={ready} />)
    expect(screen.getByText('Minden kitöltve!')).toBeTruthy()
  })
})

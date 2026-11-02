import { beforeEach, expect, it, vi } from 'vitest'
import { saveMealAction } from '@/app/actions/meal-actions'

const mock = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), mutation: vi.fn(), upload: vi.fn(), remove: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/meal-image-upload', () => ({ uploadMealImage: mock.upload, removeMealImage: mock.remove }))
vi.mock('@/lib/auth/server', () => ({ getAuthenticatedServerUser: async () => ({ user: { id: 'owner' }, supabase: client }) }))
const client = { from: () => {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: mock.read, single: mock.mutation,
    update: (patch: unknown) => { mock.update(patch); return chain }, insert: () => chain }
  return chain
} }
const original = { id: 'record', recorded_by: 'owner', created_at: '2026-11-02T10:00:00Z', updated_at: '2026-11-02T10:00:00Z', meal_image_path: 'old-path' }
const input = { date: '2026-11-02', had_meal: true, meal_name: 'Leves', reason: null, team: 'A' as const }
beforeEach(() => {
  mock.read.mockReset().mockResolvedValue({ data: original, error: null })
  mock.update.mockReset()
  mock.mutation.mockReset().mockResolvedValue({ data: { id: 'record', created_at: original.created_at }, error: null })
  mock.upload.mockReset().mockResolvedValue('new-path')
  mock.remove.mockReset().mockResolvedValue(undefined)
})
it('preserves both stored image fields when the image was not edited', async () => {
  expect((await saveMealAction(input)).success).toBe(true)
  expect(mock.update.mock.calls[0][0]).not.toHaveProperty('meal_image_url')
  expect(mock.update.mock.calls[0][0]).not.toHaveProperty('meal_image_path')
  expect(mock.upload).not.toHaveBeenCalled()
  expect(mock.remove).not.toHaveBeenCalled()
})
it('stores a Storage path and removes the previous files only after a successful save', async () => {
  expect((await saveMealAction({ ...input, meal_image_url: 'data:image/jpeg;base64,NEW' })).success).toBe(true)
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ meal_image_path: 'new-path', meal_image_url: null }))
  expect(mock.remove).toHaveBeenCalledWith(client, 'owner', 'old-path')
})
it('rolls back the new upload after a definitive database rejection and keeps the old files', async () => {
  mock.mutation.mockResolvedValue({ data: null, error: { code: '23514', message: 'check constraint' } })
  expect((await saveMealAction({ ...input, meal_image_url: 'data:image/jpeg;base64,NEW' })).success).toBe(false)
  expect(mock.remove).toHaveBeenCalledWith(client, 'owner', 'new-path')
  expect(mock.remove).not.toHaveBeenCalledWith(client, 'owner', 'old-path')
})
it('keeps uploaded files after an ambiguous failure even if a read still sees the old path', async () => {
  mock.mutation.mockResolvedValue({ data: null, error: { message: 'connection closed before commit acknowledgement' } })
  await saveMealAction({ ...input, meal_image_url: 'data:image/jpeg;base64,NEW' })
  expect(mock.remove).not.toHaveBeenCalled()
})
it('keeps uploaded files when a lost acknowledgement may hide a committed save', async () => {
  mock.mutation.mockResolvedValue({ data: null, error: { message: 'connection closed' } })
  mock.read.mockResolvedValueOnce({ data: original, error: null })
    .mockResolvedValueOnce({ data: { meal_image_path: 'new-path' }, error: null })
  await saveMealAction({ ...input, meal_image_url: 'data:image/jpeg;base64,NEW' })
  expect(mock.remove).not.toHaveBeenCalledWith(client, 'owner', 'new-path')
})
it('removes a photo explicitly without uploading or removing it before the save', async () => {
  expect((await saveMealAction({ ...input, meal_image_url: null })).success).toBe(true)
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ meal_image_path: null, meal_image_url: null }))
  expect(mock.upload).not.toHaveBeenCalled()
  expect(mock.remove).toHaveBeenCalledWith(client, 'owner', 'old-path')
})

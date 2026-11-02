import sharp from 'sharp'
import { beforeEach, expect, it, vi } from 'vitest'
import { uploadMealImage, removeMealImage, type ImageStorageClient } from '@/lib/meal-image-upload'

const owner = '11111111-1111-4111-8111-111111111111'
const other = '33333333-3333-4333-8333-333333333333'
const upload = vi.fn(), remove = vi.fn()
const client = { storage: { from: () => ({ upload, remove }) } } as unknown as ImageStorageClient
let image: string
beforeEach(async () => {
  upload.mockReset().mockResolvedValue({ error: null })
  remove.mockReset().mockResolvedValue({ error: null })
  const jpeg = await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#e06530' } }).jpeg().toBuffer()
  image = `data:image/jpeg;base64,${jpeg.toString('base64')}`
})
it('uploads separate immutable 1280px and 384px JPEG variants', async () => {
  const path = await uploadMealImage(client, owner, image)
  expect(path).toMatch(new RegExp(`^${owner}/[0-9a-f-]{36}$`))
  expect(upload).toHaveBeenCalledTimes(2)
  const full = upload.mock.calls.find(([path]) => path.endsWith('/full.jpg'))!
  const thumbnail = upload.mock.calls.find(([path]) => path.endsWith('/thumbnail.jpg'))!
  expect((await sharp(full[1]).metadata()).width).toBe(1280)
  expect((await sharp(thumbnail[1]).metadata()).width).toBe(384)
  expect(full[2]).toMatchObject({ contentType: 'image/jpeg', upsert: false })
})
it('does not accept a signed URL or invalid image bytes as an upload', async () => {
  await expect(uploadMealImage(client, owner, 'https://private.example/signed')).rejects.toThrow()
  await expect(uploadMealImage(client, owner, 'data:image/jpeg;base64,YmFk')).rejects.toThrow()
  expect(upload).not.toHaveBeenCalled()
})
it('removes newly created files if either variant upload fails', async () => {
  upload.mockImplementation(async (path: string) => ({ error: path.endsWith('/thumbnail.jpg') ? new Error('network') : null }))
  await expect(uploadMealImage(client, owner, image)).rejects.toThrow()
  expect(remove).toHaveBeenCalledTimes(1)
  expect(remove.mock.calls[0][0].every((path: string) => path.startsWith(`${owner}/`))).toBe(true)
})
it('refuses to delete another owner’s files or a malformed path', async () => {
  await expect(removeMealImage(client, owner, `${other}/22222222-2222-4222-8222-222222222222`)).rejects.toThrow()
  await expect(removeMealImage(client, owner, `${owner}/../../private`)).rejects.toThrow()
  expect(remove).not.toHaveBeenCalled()
})

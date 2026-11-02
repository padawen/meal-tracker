import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { MEAL_IMAGE_BUCKET, mealImageObjectPath } from './meal-image-storage'

export type ImageStorageClient = Pick<SupabaseClient, 'storage'>
export async function uploadMealImage(client: ImageStorageClient, ownerId: string, dataUrl: string): Promise<string> {
  if (dataUrl.length > 1_600_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) {
    throw new Error('Csak legfeljebb 1,2 MB méretű képfájl menthető.')
  }
  const path = `${ownerId}/${crypto.randomUUID()}`
  const fullPath = mealImageObjectPath(path, 'full')
  const thumbnailPath = mealImageObjectPath(path, 'thumbnail')
  let full: Buffer, thumbnail: Buffer
  try {
    const source = sharp(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'), { limitInputPixels: 40_000_000 }).rotate()
    ;[full, thumbnail] = await Promise.all([
      source.clone().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(),
      source.clone().resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 65 }).toBuffer(),
    ])
  } catch {
    throw new Error('Nem sikerült feldolgozni a képet. Válassz másik képfájlt.')
  }
  const bucket = client.storage.from(MEAL_IMAGE_BUCKET)
  const results = await Promise.allSettled([
    bucket.upload(fullPath, full, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }),
    bucket.upload(thumbnailPath, thumbnail, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }),
  ])
  if (results.some((result) => result.status === 'rejected' || result.value.error)) {
    // Include both names: a response can be lost after Storage accepted a file.
    await bucket.remove([fullPath, thumbnailPath]).catch(() => undefined)
    throw new Error('Nem sikerült feltölteni a képet. Próbáld újra.')
  }
  return path
}
export async function removeMealImage(client: ImageStorageClient, ownerId: string, path: string): Promise<void> {
  const full = mealImageObjectPath(path, 'full')
  if (path.split('/')[0] !== ownerId) throw new Error('Nincs jogosultságod a kép törléséhez.')
  const { error } = await client.storage.from(MEAL_IMAGE_BUCKET).remove([full, mealImageObjectPath(path, 'thumbnail')])
  if (error) throw new Error('Nem sikerült törölni a korábbi képet.')
}

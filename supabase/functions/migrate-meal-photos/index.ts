// One-time maintenance worker. The checked-in version is disabled. Deploy with
// a short-lived SHA-256 secret hash, invoke in small batches, then disable again.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import jpeg from 'npm:jpeg-js@0.4.4'
import { thumbnailPixels } from './thumbnail.ts'

const SECRET_HASH = ''
const EXPIRES_AT = 0
const bucketName = 'meal-photos'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})
async function digest(bytes: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(byte => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request: Request) => {
  if (!SECRET_HASH || Date.now() > EXPIRES_AT) return json({ disabled: true }, 410)
  if (request.method !== 'POST') return json({ error: 'method' }, 405)
  const token = request.headers.get('x-migration-secret') || ''
  if (token.length !== 64 || await digest(new TextEncoder().encode(token)) !== SECRET_HASH) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const bucket = supabase.storage.from(bucketName)
  let stage = 'select'
  let activePaths: string[] = []
  let updateSubmitted = false
  try {
    const { data: records, error } = await supabase.from('meal_records')
      .select('id,recorded_by,meal_image_url,updated_at')
      .is('meal_image_path', null).like('meal_image_url', 'data:image/jpeg;base64,%')
      .order('date').limit(2)
    if (error) throw error
    let migrated = 0, conflicts = 0, fullBytes = 0, thumbnailBytes = 0
    for (const record of records || []) {
      updateSubmitted = false
      stage = 'decode'
      const base64 = record.meal_image_url.slice(record.meal_image_url.indexOf(',') + 1)
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
      const decoded = jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: 16, maxMemoryUsageInMB: 96 })
      const thumbnail = jpeg.encode(thumbnailPixels(decoded), 65).data
      const path = `${record.recorded_by}/${crypto.randomUUID()}`
      activePaths = [`${path}/full.jpg`, `${path}/thumbnail.jpg`]
      stage = 'upload'
      const uploads = await Promise.allSettled([
        bucket.upload(activePaths[0], bytes, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }),
        bucket.upload(activePaths[1], thumbnail, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }),
      ])
      if (uploads.some(result => result.status === 'rejected' || result.value.error)) throw new Error('upload')
      stage = 'verify'
      const { data: uploaded, error: downloadError } = await bucket.download(activePaths[0])
      if (downloadError || !uploaded || await digest(new Uint8Array(await uploaded.arrayBuffer())) !== await digest(bytes)) throw new Error('checksum')
      stage = 'update'
      updateSubmitted = true
      // Retain the legacy payload so the currently deployed reader keeps working.
      // The version predicate protects edits made while these files uploaded.
      const { data: saved, error: saveError } = await supabase.from('meal_records')
        .update({ meal_image_path: path }).eq('id', record.id).eq('updated_at', record.updated_at)
        .is('meal_image_path', null).select('id').maybeSingle()
      if (saveError) {
        if (/^(22|23|28|40|42)[0-9A-Z]{3}$/.test(saveError.code || '')) updateSubmitted = false
        throw saveError
      }
      if (!saved) {
        await bucket.remove(activePaths)
        conflicts++
      } else {
        migrated++
        fullBytes += bytes.length
        thumbnailBytes += thumbnail.length
      }
      activePaths = []
      updateSubmitted = false
    }
    const { count, error: countError } = await supabase.from('meal_records')
      .select('id', { count: 'exact', head: true }).is('meal_image_path', null)
      .like('meal_image_url', 'data:image/jpeg;base64,%')
    if (countError) throw countError
    return json({ migrated, conflicts, fullBytes, thumbnailBytes, remaining: count })
  } catch {
    if (activePaths.length && !updateSubmitted) {
      await bucket.remove(activePaths).catch(() => undefined)
    }
    console.error('Meal photo migration stopped at stage:', stage)
    return json({ error: 'migration stopped', stage }, 500)
  }
})

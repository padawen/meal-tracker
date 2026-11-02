'use server'

import { revalidatePath } from 'next/cache'
import type { PostgrestSingleResponse } from '@supabase/supabase-js'

import { getAuthenticatedServerUser } from '@/lib/auth/server'
import { uploadMealImage, removeMealImage } from '@/lib/meal-image-upload'

type ExistingMealRecordOwner = {
    id: string
    recorded_by: string | null
    created_at: string
    updated_at: string
    meal_image_path: string | null
}

async function getExistingMealRecordOwner(
    supabase: Awaited<ReturnType<typeof getAuthenticatedServerUser>>['supabase'],
    date: string
) {
    const { data, error } = await supabase
        .from('meal_records')
        .select('id, recorded_by, created_at, updated_at, meal_image_path')
        .eq('date', date)
        .maybeSingle<ExistingMealRecordOwner>()

    if (error) {
        return { data: null, error }
    }

    return { data, error: null }
}

async function getProfileDisplayName(
    supabase: Awaited<ReturnType<typeof getAuthenticatedServerUser>>['supabase'],
    userId?: string | null
) {
    if (!userId) {
        return 'Valaki'
    }

    const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .maybeSingle()

    return data?.full_name || data?.email || 'Valaki'
}

async function buildConflictResponse(
    supabase: Awaited<ReturnType<typeof getAuthenticatedServerUser>>['supabase'],
    existing: ExistingMealRecordOwner | null
) {
    const name = await getProfileDisplayName(supabase, existing?.recorded_by)

    return {
        conflict: true,
        error: `${name} már kitöltötte`,
        success: false as const,
    }
}

export async function saveMealAction(
    record: {
        date: string
        had_meal: boolean
        meal_name: string | null
        meal_image_url?: string | null
        reason: string | null
        team: "A" | "B" | null
    }
) {
    const { supabase, user } = await getAuthenticatedServerUser()

    const existingResult = await getExistingMealRecordOwner(supabase, record.date)

    if (existingResult.error) {
        return { success: false, error: existingResult.error.message || 'Nem sikerült lekérni a meglévő rekordot' }
    }

    const existing = existingResult.data

    if (existing && existing.recorded_by !== user.id) {
        return buildConflictResponse(supabase, existing)
    }

    const imageChanged = !record.had_meal || record.meal_image_url !== undefined
    let uploadedPath: string | null = null
    if (record.had_meal && record.meal_image_url) {
        try {
            uploadedPath = await uploadMealImage(supabase, user.id, record.meal_image_url)
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Nem sikerült feltölteni a képet.' }
        }
    }
    const imagePatch = imageChanged ? { meal_image_path: uploadedPath, meal_image_url: null } : {}
    const cleanup = async (path: string) => {
        try { await removeMealImage(supabase, user.id, path) }
        catch { console.error('Meal image cleanup failed') }
    }
    let mutation: PostgrestSingleResponse<{ id: string; created_at: string }>

    try {
    if (existing) {
        mutation = await supabase
            .from('meal_records')
            .update({
                had_meal: record.had_meal,
                meal_name: record.meal_name,
                ...imagePatch,
                reason: record.reason,
                team: record.team,
            })
            .eq('id', existing.id)
            .eq('updated_at', existing.updated_at)
            .select('id, created_at')
            .single()
    } else {
        mutation = await supabase
            .from('meal_records')
            .insert({
                date: record.date,
                had_meal: record.had_meal,
                meal_name: record.meal_name,
                reason: record.reason,
                team: record.team,
                ...imagePatch,
                recorded_by: user.id,
            })
            .select('id, created_at')
            .single()
    }
    } catch {
        // The transaction may still commit after a lost response. A fresh read
        // can race that commit too, so preserve the upload on ambiguous errors.
        return { success: false, error: 'Nem sikerült menteni a bejegyzést. Próbáld újra.' }
    }

    const { data: updatedRecord, error } = mutation

    if (error) {
        const definitelyRejected = error.code === 'PGRST116' || /^(22|23|28|40|42)[0-9A-Z]{3}$/.test(error.code || '')
        if (uploadedPath && definitelyRejected) await cleanup(uploadedPath)
        if (error.code === 'PGRST116') {
            return { success: false, conflict: true, error: 'A bejegyzés közben módosult. Nyisd meg újra a friss adatokat.' }
        }
        if (error.code === '23505') {
            const conflictingRecord = await getExistingMealRecordOwner(supabase, record.date)
            return buildConflictResponse(supabase, conflictingRecord.data)
        }

        if (error.message?.includes('row-level security policy')) {
            return { success: false, error: 'Nincs jogosultságod a bejegyzés mentéséhez.' }
        }

        return { success: false, error: error.message || 'Database error' }
    }
    if (imageChanged && existing?.meal_image_path && existing.meal_image_path !== uploadedPath) {
        await cleanup(existing.meal_image_path)
    }

    revalidatePath('/')
    return { success: true, recordId: updatedRecord?.id, timestamp: updatedRecord?.created_at }
}

export async function deleteMealAction(date: string) {
    const { supabase, user } = await getAuthenticatedServerUser()

    const { data: existing } = await supabase
        .from('meal_records')
        .select('id, recorded_by, updated_at, meal_image_path')
        .eq('date', date)
        .maybeSingle()

    if (!existing) {
         return { success: false, error: 'A rekord nem található' }
    }

    if (existing.recorded_by !== user.id) {
        return { success: false, error: 'Csak a létrehozó törölheti ezt a rekordot' }
    }

    const { data: deleted, error } = await supabase
        .from('meal_records')
        .delete()
        .eq('id', existing.id)
        .eq('updated_at', existing.updated_at)
        .select('id')
        .maybeSingle()

    if (error || !deleted) {
        return { success: false, error: 'Adatbázis hiba a törlés során' }
    }
    if (existing.meal_image_path) {
        try { await removeMealImage(supabase, user.id, existing.meal_image_path) }
        catch { console.error('Meal image cleanup failed') }
    }

    revalidatePath('/')
    return { success: true }
}

export async function saveMealRatingAction(mealRecordId: string, rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return { success: false, error: 'Az értékelésnek 1 és 5 között kell lennie' }
    }

    const { supabase, user } = await getAuthenticatedServerUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved, is_admin')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.is_approved && !profile?.is_admin) {
        return { success: false, error: 'Csak jóváhagyott felhasználó értékelhet' }
    }

    const { data: meal } = await supabase
        .from('meal_records')
        .select('id, had_meal')
        .eq('id', mealRecordId)
        .maybeSingle()

    if (!meal?.had_meal) {
        return { success: false, error: 'Csak meglévő étkezés értékelhető' }
    }

    const { error } = await supabase.from('meal_ratings').insert({
        meal_record_id: mealRecordId,
        user_id: user.id,
        rating,
    })

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Ezt a napot már értékelted' }
        }
        return { success: false, error: error.message || 'Nem sikerült menteni az értékelést' }
    }

    revalidatePath('/')
    revalidatePath('/statistics')
    return { success: true }
}

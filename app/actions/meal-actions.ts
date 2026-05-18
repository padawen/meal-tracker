'use server'

import { revalidatePath } from 'next/cache'
import type { PostgrestSingleResponse } from '@supabase/supabase-js'

import { getAuthenticatedServerUser } from '@/lib/auth/server'

async function getExistingMealRecordOwner(
    supabase: Awaited<ReturnType<typeof getAuthenticatedServerUser>>['supabase'],
    date: string
) {
    const { data } = await supabase
        .from('meal_records')
        .select(`
            recorded_by,
            created_at,
            profiles ( full_name, email )
        `)
        .eq('date', date)
        .maybeSingle()

    return data
}

function buildConflictResponse(
    existing: Awaited<ReturnType<typeof getExistingMealRecordOwner>>
) {
    const name = (existing?.profiles as any)?.full_name || (existing?.profiles as any)?.email || 'Valaki'

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
        meal_image_url: string | null
        reason: string | null
        team: "A" | "B" | null
    }
) {
    const { supabase, user } = await getAuthenticatedServerUser()

    const existing = await getExistingMealRecordOwner(supabase, record.date)

    if (existing && existing.recorded_by !== user.id) {
        return buildConflictResponse(existing)
    }

    let mutation: PostgrestSingleResponse<{ created_at: string }>

    if (existing) {
        mutation = await supabase
            .from('meal_records')
            .update({
                had_meal: record.had_meal,
                meal_name: record.meal_name,
                meal_image_url: record.meal_image_url,
                reason: record.reason,
                team: record.team,
            })
            .eq('date', record.date)
            .eq('recorded_by', user.id)
            .select('created_at')
            .single()
    } else {
        mutation = await supabase
            .from('meal_records')
            .insert({
                ...record,
                recorded_by: user.id,
            })
            .select('created_at')
            .single()
    }

    const { data: updatedRecord, error } = mutation

    if (error) {
        if (error.code === '23505') {
            const conflictingRecord = await getExistingMealRecordOwner(supabase, record.date)
            return buildConflictResponse(conflictingRecord)
        }

        if (error.message?.includes('row-level security policy')) {
            return { success: false, error: 'Az adatbázis még a régi dátumszabályt használja. Futtasd le a legfrissebb migrációt.' }
        }

        return { success: false, error: error.message || 'Database error' }
    }

    revalidatePath('/')
    return { success: true, timestamp: updatedRecord?.created_at }
}

export async function deleteMealAction(date: string) {
    const { supabase, user } = await getAuthenticatedServerUser()

    const { data: existing } = await supabase
        .from('meal_records')
        .select('recorded_by')
        .eq('date', date)
        .maybeSingle()

    if (!existing) {
         return { success: false, error: 'A rekord nem található' }
    }

    if (existing.recorded_by !== user.id) {
        return { success: false, error: 'Csak a létrehozó törölheti ezt a rekordot' }
    }

    const { error } = await supabase
        .from('meal_records')
        .delete()
        .eq('date', date)

    if (error) {
        return { success: false, error: 'Adatbázis hiba a törlés során' }
    }

    revalidatePath('/')
    return { success: true }
}

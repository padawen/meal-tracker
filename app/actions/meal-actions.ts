'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function saveMealAction(
    record: {
        date: string
        had_meal: boolean
        meal_name: string | null
        reason: string | null
        team: "A" | "B" | null
    },
    userId: string
) {
    const supabase = await createSupabaseServerClient()

    const { data: existing } = await supabase
        .from('meal_records')
        .select(`
            recorded_by,
            profiles ( full_name, email )
        `)
        .eq('date', record.date)
        .maybeSingle()

    if (existing && existing.recorded_by !== userId) {
        const name = (existing.profiles as any)?.full_name || (existing.profiles as any)?.email || 'Valaki';
        return { success: false, error: `${name} már kitöltötte` }
    }

    const { data: updatedRecord, error } = await supabase
        .from('meal_records')
        .upsert({
            ...record,
            recorded_by: userId,
        }, { onConflict: 'date' })
        .select('created_at')
        .single()

    if (error) {
        return { success: false, error: 'Database error' }
    }

    revalidatePath('/')
    return { success: true, timestamp: updatedRecord?.created_at }
}

export async function deleteMealAction(date: string, userId: string) {
    const supabase = await createSupabaseServerClient()

    const { data: existing } = await supabase
        .from('meal_records')
        .select('recorded_by')
        .eq('date', date)
        .maybeSingle()

    if (!existing) {
         return { success: false, error: 'A rekord nem található' }
    }

    if (existing.recorded_by !== userId) {
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

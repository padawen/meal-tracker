'use server'

import { revalidatePath } from 'next/cache'

import { getAuthenticatedServerUser } from '@/lib/auth/server'

export async function saveMealAction(
    record: {
        date: string
        had_meal: boolean
        meal_name: string | null
        reason: string | null
        team: "A" | "B" | null
    }
) {
    const { supabase, user } = await getAuthenticatedServerUser()

    const { data: existing } = await supabase
        .from('meal_records')
        .select(`
            recorded_by,
            profiles ( full_name, email )
        `)
        .eq('date', record.date)
        .maybeSingle()

    if (existing && existing.recorded_by !== user.id) {
        const name = (existing.profiles as any)?.full_name || (existing.profiles as any)?.email || 'Valaki';
        return { success: false, error: `${name} már kitöltötte` }
    }

    const { data: updatedRecord, error } = await supabase
        .from('meal_records')
        .upsert({
            ...record,
            recorded_by: user.id,
        }, { onConflict: 'date' })
        .select('created_at')
        .single()

    if (error) {
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

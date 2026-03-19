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

    // 1. Check if record exists
    const { data: existing } = await supabase
        .from('meal_records')
        .select('recorded_by')
        .eq('date', record.date)
        .maybeSingle()

    // 2. If exists, ensure only original user can edit
    if (existing && existing.recorded_by !== userId) {
        throw new Error('Only the creator can modify this record')
    }

    const { error } = await supabase
        .from('meal_records')
        .upsert({
            ...record,
            recorded_by: userId,
        }, { onConflict: 'date' })

    if (error) throw error

    revalidatePath('/')
    return { success: true }
}

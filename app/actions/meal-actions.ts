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

export async function deleteMealAction(date: string, userId: string) {
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
        .from('meal_records')
        .delete()
        .eq('date', date)

    if (error) throw error

    revalidatePath('/')
    return { success: true }
}

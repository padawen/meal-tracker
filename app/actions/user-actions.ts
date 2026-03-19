'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function updateProfileAction(fullName: string | null, userId: string) {
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', userId)

    if (error) throw error

    revalidatePath('/')
    return { success: true }
}

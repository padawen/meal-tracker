'use server'

import { revalidatePath } from 'next/cache'

import { getAuthenticatedServerUser } from '@/lib/auth/server'

export async function updateProfileAction(fullName: string | null) {
    const { supabase, user } = await getAuthenticatedServerUser()

    const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

    if (error) throw error

    revalidatePath('/')
    return { success: true }
}

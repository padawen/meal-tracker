'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server'

const MASTER_ADMIN_IDS = process.env.NEXT_PUBLIC_MASTER_ADMIN_IDS?.split(',').map(id => id.trim()) || []

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function getAdminStatus(client: SupabaseServerClient, userId: string) {
    const { data: profile } = await client
        .from('profiles')
        .select('is_admin, full_name')
        .eq('id', userId)
        .single()

    return {
        isAdmin: profile?.is_admin || false,
        isMaster: MASTER_ADMIN_IDS.includes(userId)
    }
}

export async function approveUserAction(targetUserId: string, requesterId: string) {
    const supabase = await createSupabaseServerClient()

    const { isAdmin } = await getAdminStatus(supabase, requesterId)
    if (!isAdmin) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', targetUserId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function rejectUserAction(targetUserId: string, requesterId: string) {
    const supabase = await createSupabaseServerClient()

    const { isAdmin, isMaster: isRequesterMaster } = await getAdminStatus(supabase, requesterId)
    if (!isAdmin) throw new Error('Unauthorized')

    const { isAdmin: targetIsAdmin, isMaster: targetIsMaster } = await getAdminStatus(supabase, targetUserId)

    if (targetIsMaster) throw new Error('Cannot reject Master Admin')

    if (targetIsAdmin && !isRequesterMaster) throw new Error('Only Master Admin can reject other admins')

    const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false, is_admin: false })
        .eq('id', targetUserId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function toggleAdminAction(targetUserId: string, targetCurrentIsAdmin: boolean, requesterId: string) {
    const supabase = await createSupabaseServerClient()

    const { isMaster } = await getAdminStatus(supabase, requesterId)
    if (!isMaster) throw new Error('Only Master Admin can toggle admin roles')

    const { isMaster: targetIsMaster } = await getAdminStatus(supabase, targetUserId)
    if (targetIsMaster) throw new Error('Cannot modify Master Admin permissions')

    const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !targetCurrentIsAdmin })
        .eq('id', targetUserId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function addHolidayAction(holiday: { date: string, name: string, description?: string | null }, requesterId: string) {
    const supabase = await createSupabaseServerClient()

    const { isAdmin } = await getAdminStatus(supabase, requesterId)
    if (!isAdmin) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('holidays')
        .insert({
            date: holiday.date,
            name: holiday.name,
            description: holiday.description || null,
            created_by: requesterId
        })

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function deleteHolidayAction(holidayId: string, requesterId: string) {
    const supabase = await createSupabaseServerClient()

    const { isAdmin } = await getAdminStatus(supabase, requesterId)
    if (!isAdmin) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}


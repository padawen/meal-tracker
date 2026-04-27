'use server'

import { revalidatePath } from 'next/cache'

import { isMasterAdmin, requireAdminViewer, requireMasterAdminViewer } from '@/lib/auth/server'

async function getAdminStatus(
    client: Awaited<ReturnType<typeof requireAdminViewer>>['supabase'],
    userId: string
) {
    const { data: profile } = await client
        .from('profiles')
        .select('is_admin, full_name')
        .eq('id', userId)
        .single()

    return {
        isAdmin: profile?.is_admin || false,
        isMaster: isMasterAdmin(userId)
    }
}

export async function approveUserAction(targetUserId: string) {
    const { supabase } = await requireAdminViewer()

    const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', targetUserId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function rejectUserAction(targetUserId: string) {
    const { supabase, isMasterAdmin: isRequesterMaster } = await requireAdminViewer()

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

export async function toggleAdminAction(targetUserId: string, targetCurrentIsAdmin: boolean) {
    const { supabase } = await requireMasterAdminViewer()

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

export async function addHolidayAction(holiday: { date: string, name: string, description?: string | null }) {
    const { supabase, user } = await requireAdminViewer()

    const { error } = await supabase
        .from('holidays')
        .insert({
            date: holiday.date,
            name: holiday.name,
            description: holiday.description || null,
            created_by: user.id
        })

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function deleteHolidayAction(holidayId: string) {
    const { supabase } = await requireAdminViewer()

    const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

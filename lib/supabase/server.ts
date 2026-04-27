import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

export const createSupabaseServerClient = async () => {
    const cookieStore = await cookies()

    return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
            },
            setAll(cookies) {
                cookies.forEach(({ name, value, options }) => {
                    cookieStore.set(name, value, options)
                })
            },
        },
    })
}

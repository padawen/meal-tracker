'use client'

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

export const supabase = createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)

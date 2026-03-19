import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const errorDescription =
        requestUrl.searchParams.get('error_description') ||
        requestUrl.searchParams.get('error')
    const nextPath = requestUrl.searchParams.get('next') || '/'

    const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin
    const redirectUrl = new URL(nextPath, redirectBase)

    if (errorDescription) {
        redirectUrl.searchParams.set('error', errorDescription)
        return NextResponse.redirect(redirectUrl)
    }

    if (code) {
        const supabase = await createSupabaseServerClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            redirectUrl.searchParams.set('error', error.message)
        }
    }

    return NextResponse.redirect(redirectUrl)
}

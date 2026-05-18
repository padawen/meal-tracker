import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/utils'

function loginErrorRedirect(requestUrl: URL, nextPath: string, errorMessage: string) {
    const redirectUrl = new URL('/login', requestUrl.origin)
    redirectUrl.searchParams.set('next', nextPath)
    redirectUrl.searchParams.set('error', errorMessage)
    return NextResponse.redirect(redirectUrl)
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const errorDescription =
        requestUrl.searchParams.get('error_description') ||
        requestUrl.searchParams.get('error')
    const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'))

    const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin
    const redirectUrl = new URL(nextPath, redirectBase)

    if (errorDescription) {
        return loginErrorRedirect(requestUrl, nextPath, errorDescription)
    }

    if (code) {
        const supabase = await createSupabaseServerClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            return loginErrorRedirect(requestUrl, nextPath, error.message)
        }
    }

    return NextResponse.redirect(redirectUrl)
}

import { LoginPageClient } from '@/components/auth/LoginPageClient'
import { sanitizeNextPath } from '@/lib/utils'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; next?: string }>
}) {
    const params = await searchParams
    const nextPath = sanitizeNextPath(params.next)

    return <LoginPageClient nextPath={nextPath} initialError={params.error} />
}

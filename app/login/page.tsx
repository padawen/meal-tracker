import { LoginPageClient } from '@/components/auth/LoginPageClient'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>
}) {
    const params = await searchParams
    const nextPath = params.next?.startsWith('/') ? params.next : '/'

    return <LoginPageClient nextPath={nextPath} />
}

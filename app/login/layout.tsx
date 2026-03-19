import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Bejelentkezés - Étkezés nyilvántartás',
    description: 'Jelentkezz be a személyzeti étkezés nyilvántartó rendszerbe.',
}

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}

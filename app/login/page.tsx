'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, UtensilsCrossed } from 'lucide-react'

import { getRedirectUrl } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [loginError, setLoginError] = useState<string | null>(null)
    const [modalError, setModalError] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [open, setOpen] = useState(false)

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            setLoginError(null)

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getRedirectUrl(),
                },
            })

            if (error) {
                setLoginError(error.message)
                setLoading(false)
            }
        } catch (err) {
            setLoginError('Hiba történt a bejelentkezés során')
            setLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setModalLoading(true)
            setModalError(null)

            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (loginError) {
                setModalError(loginError.message)
                setModalLoading(false)
                return
            }

            setOpen(false)
            router.push('/')
        } catch (err) {
            setModalError('Hiba történt a bejelentkezés során')
            setModalLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 p-4">
            <div className="w-full max-w-md">
                <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                    <CardHeader className="space-y-3 pb-6">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <UtensilsCrossed className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Személyzeti
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 pb-8">
                        {loginError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                                    {loginError}
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            )}
                            {loading ? 'Bejelentkezés...' : 'Bejelentkezés Google-lal'}
                        </Button>

                        <Dialog open={open} onOpenChange={(val) => {
                            setOpen(val)
                            if (!val) setModalError(null)
                        }}>
                            <DialogTrigger asChild>
                                <Button
                                    className="w-full h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                >
                                    Nikka
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md border-none shadow-2xl p-8 bg-white dark:bg-gray-900">
                                <DialogTitle className="sr-only">Bejelentkezés</DialogTitle>
                                {modalError && (
                                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400 text-center">
                                            {modalError}
                                        </p>
                                    </div>
                                )}
                                <form onSubmit={handleEmailLogin} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-12 border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/30 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Jelszó</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="h-12 border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/30 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 transition-all"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={modalLoading}
                                        className="w-full h-12 mt-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                    >
                                        {modalLoading ? (
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        ) : 'Belépés'}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

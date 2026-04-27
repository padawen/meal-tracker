'use client'

import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase/client'

export function PendingApprovalCard() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold">Jóváhagyásra vár</h2>
        <p className="text-gray-600 text-sm">Egy adminnak jóvá kell hagynia a hozzáférést.</p>
        <button
          onClick={() => {
            void handleSignOut()
          }}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
        >
          Kijelentkezés
        </button>
      </div>
    </div>
  )
}

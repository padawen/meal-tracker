import { Loader2 } from 'lucide-react'

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  )
}

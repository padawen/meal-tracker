import type { ReactNode } from 'react'
import type { RangeStatus } from '@/lib/meal-cache'

export function LoadingState({ status, retry, children, label = 'Adatok betöltése', className = 'min-h-24' }: {
  status: RangeStatus
  retry: () => void
  children: ReactNode
  label?: string
  className?: string
}) {
  if (status === 'ready') return children
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`} aria-busy={status === 'loading'}>
      {status === 'error' ? (
        <div role="alert" className="space-y-2 text-sm text-rose-700">
          <p>Nem sikerült betölteni az adatokat.</p>
          <button type="button" onClick={retry} className="rounded-lg border border-rose-200 px-3 py-2 font-semibold focus-visible:outline-2">Újrapróbálás</button>
        </div>
      ) : (
        <div role="status" aria-label={label} className="space-y-3 motion-safe:animate-pulse">
          <span className="sr-only">{label}</span>
          <div className="h-3 w-24 rounded bg-gray-100" />
          <div className="h-5 w-40 rounded bg-gray-100" />
        </div>
      )}
    </div>
  )
}

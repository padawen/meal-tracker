'use client'

import { useState } from 'react'
import { useMealDataContext } from './MealDataContext'
import { useMealImage } from './useMealImage'

export function MealPhoto({ recordId }: { recordId: string }) {
  const image = useMealImage(recordId)
  const { images } = useMealDataContext()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [decodedUrl, setDecodedUrl] = useState<string | null>(null)
  const error = image.status === 'error' || (Boolean(image.url) && failedUrl === image.url)
  const retry = () => {
    setFailedUrl(null)
    setDecodedUrl(null)
    images.invalidate(recordId)
    void images.load(recordId)
  }
  if (error) return (
    <div role="alert" className="absolute inset-x-12 top-1/3 z-20 space-y-3 text-center text-sm text-white">
      <p>Nem sikerült betölteni a képet.</p>
      <button type="button" onClick={retry} className="rounded-lg border border-white/50 bg-black px-4 py-2 font-semibold focus-visible:outline-2">Újrapróbálás</button>
    </div>
  )
  if (image.status === 'ready' && !image.url) return <p className="px-12 pt-24 text-center text-sm text-white">Ez a kép már nem érhető el.</p>
  return (
    <>
      {(!image.url || decodedUrl !== image.url) && (
        <p role="status" className="absolute inset-x-12 top-1/3 text-center text-sm text-white/80">Kép betöltése...</p>
      )}
      {image.url && <img src={image.url} alt="Ételfotó" className="h-full w-full object-contain" decoding="async"
        onLoad={() => setDecodedUrl(image.url || null)} onError={() => setFailedUrl(image.url || null)} />}
    </>
  )
}

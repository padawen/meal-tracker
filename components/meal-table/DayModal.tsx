"use client"

import type { ChangeEvent } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { X, Check, XIcon, Trash2, ImagePlus, Trash, ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAuth } from "@/components/auth/AuthGuard"

import type { MealDayData as DayData } from '@/lib/meal-domain'
import { useMealImage } from './useMealImage'
import { MealPhoto } from './MealPhoto'

interface DayModalProps {
  day: DayData
  onClose: () => void
  onSave: (day: DayData, hadFood: boolean, details: string, team?: "A" | "B", mealImageUrl?: string) => void
  onDelete?: (day: DayData) => void
  onRate?: (day: DayData, rating: number) => void
  isSaving?: boolean
  isDeletePending?: boolean
  isRatingPending?: boolean
  isVotingMode?: boolean
  canMovePrevious?: boolean
  canMoveNext?: boolean
  navigationLoading?: boolean
  navigationError?: boolean
  onRetryNavigation?: () => void
  onImageNavigate?: (direction: "previous" | "next") => void
}

function MealRatingControl({
  day,
  onRate,
  isPending,
  overlay = false,
  compact = false,
}: {
  day: DayData
  onRate?: (day: DayData, rating: number) => void
  isPending: boolean
  overlay?: boolean
  compact?: boolean
}) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [selectedRating, setSelectedRating] = useState<number | null>(day.myRating ?? null)
  const dayKey = day.recordId ?? day.date.toISOString()
  const hasRated = Boolean(day.myRating)
  const previewRating = hoveredRating ?? selectedRating
  const averageLabel = day.ratingCount
    ? `${day.ratingAverage?.toFixed(1).replace('.', ',')} · ${day.ratingCount} értékelés`
    : 'Nincs értékelés'

  useEffect(() => {
    setHoveredRating(null)
    setSelectedRating(day.myRating ?? null)
  }, [dayKey, day.myRating])

  if (overlay || compact) {
    if (overlay) {
      return (
        <div className={`flex w-full flex-wrap items-center ${hasRated ? "justify-center" : "justify-between"} gap-2 rounded-xl border border-white/20 bg-black/60 px-3 py-2.5 shadow-sm backdrop-blur-sm`}>
          <div className="flex shrink-0 items-center gap-0" aria-label={hasRated ? `Saját értékelés: ${day.myRating} az 5 csillagból` : "Étel értékelése egytől ötig"}>
            {[1, 2, 3, 4, 5].map((value) => {
              const isActive = value <= (hasRated ? (day.myRating || 0) : (hoveredRating ?? selectedRating ?? 0))
              const star = <Star className={`h-5 w-5 ${isActive ? "fill-amber-400 text-amber-300" : "fill-transparent text-white/70"}`} />

              if (hasRated) {
                return <span key={value}>{star}</span>
              }

              return (
                <button
                  key={value}
                  type="button"
                  disabled={isPending || !day.recordId}
                  onClick={() => setSelectedRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(null)}
                  aria-label={`${value} csillag`}
                  className="rounded-full p-0.5 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {star}
                </button>
              )
            })}
          </div>

          {!hasRated && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelectedRating(null)
                  setHoveredRating(null)
                }}
                className="h-8 rounded-md px-2.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={!selectedRating || isPending || !day.recordId}
                onClick={() => selectedRating && onRate?.(day, selectedRating)}
                className="h-8 rounded-md bg-amber-400 px-3 text-xs font-bold text-amber-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Mentés..." : "Szavazás"}
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flex min-h-[82px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2 shadow-lg">
        <div className="flex items-center gap-0.5" aria-label={hasRated ? `Saját értékelés: ${day.myRating} az 5 csillagból` : "Étel értékelése egytől ötig"}>
          {[1, 2, 3, 4, 5].map((value) => {
            const isActive = value <= (hasRated ? (day.myRating || 0) : (hoveredRating ?? selectedRating ?? 0))
            const star = <Star className={`h-6 w-6 ${isActive ? "fill-amber-400 text-amber-500" : overlay ? "fill-white/20 text-white/50" : "fill-gray-200 text-gray-300"}`} />

            if (hasRated) {
              return <span key={value}>{star}</span>
            }

            return (
              <button
                key={value}
                type="button"
                disabled={isPending || !day.recordId}
                onClick={() => setSelectedRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(null)}
                aria-label={`${value} csillag`}
                className="rounded-full p-1 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {star}
              </button>
            )
          })}
        </div>

        {!hasRated && (
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setSelectedRating(null)
                setHoveredRating(null)
              }}
              className={`h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${overlay ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Mégse
            </button>
            <button
              type="button"
              disabled={!selectedRating || isPending || !day.recordId}
              onClick={() => selectedRating && onRate?.(day, selectedRating)}
              className="h-10 flex-1 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Mentés..." : "Szavazás"}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={overlay
      ? "min-h-[118px] rounded-2xl border border-white/20 bg-black/60 px-3 py-3 text-white shadow-lg backdrop-blur-md"
      : "rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3"
    }>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={overlay ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-800"}>Értékelés</p>
          <p className={overlay ? "text-xs text-white/70" : "text-xs text-gray-500"}>{averageLabel}</p>
        </div>
        {hasRated ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-0.5" aria-label={`Saját értékelés: ${day.myRating} az 5 csillagból`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={`h-6 w-6 ${value <= (day.myRating || 0) ? "fill-amber-400 text-amber-500" : overlay ? "fill-white/20 text-white/40" : "fill-gray-200 text-gray-300"}`}
                />
              ))}
            </div>
            <span className={overlay ? "text-sm font-bold text-amber-200" : "text-sm font-bold text-amber-700"}>Te: {day.myRating}/5 csillag</span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-0.5" aria-label="Étel értékelése egytől ötig">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                disabled={isPending || !day.recordId}
                onClick={() => setSelectedRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(null)}
                aria-label={`${value} csillag`}
                className="rounded-full p-1 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Star className={`h-6 w-6 ${previewRating && value <= previewRating ? "fill-amber-400 text-amber-500" : "fill-gray-200 text-gray-300"}`} />
              </button>
            ))}
            </div>
            <span className={overlay ? "text-xs font-semibold text-amber-200" : "text-xs font-semibold text-amber-700"}>
              {previewRating ? `${previewRating}/5 csillag` : "Válassz csillagot"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setSelectedRating(null)
                  setHoveredRating(null)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${overlay ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={!selectedRating || isPending || !day.recordId}
                onClick={() => selectedRating && onRate?.(day, selectedRating)}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Mentés..." : "Szavazás"}
              </button>
            </div>
          </div>
        )}
      </div>
      {!hasRated && <p className={overlay ? "mt-2 text-[11px] text-white/60" : "mt-2 text-[11px] text-gray-500"}>A szavazatod egyszer adható le.</p>}
    </div>
  )
}

async function resizeImageToDataUrl(file: File) {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Nem sikerült betölteni a képet"))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Nem sikerült megnyitni a képet"))
    img.src = rawDataUrl
  })

  const maxSize = 1280
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(image.width * ratio)
  canvas.height = Math.round(image.height * ratio)

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Nem sikerült előkészíteni a képet")
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL("image/jpeg", 0.82)
}

function dataUrlToBlob(dataUrl: string) {
  const [header, content] = dataUrl.split(",", 2)
  const mimeMatch = header.match(/data:(.*?)(;base64)?$/)

  if (!mimeMatch) {
    throw new Error("Érvénytelen képformátum")
  }

  const mimeType = mimeMatch[1] || "image/jpeg"
  const isBase64 = header.includes(";base64")

  if (isBase64) {
    const binary = atob(content)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return new Blob([bytes], { type: mimeType })
  }

  return new Blob([decodeURIComponent(content)], { type: mimeType })
}

function openImageInCurrentTab(imageUrl: string) {
  const nextUrl = imageUrl.startsWith("data:")
    ? URL.createObjectURL(dataUrlToBlob(imageUrl))
    : imageUrl

  window.location.assign(nextUrl)
}

export function DayModal({
  day,
  onClose,
  onSave,
  onDelete,
  onRate,
  isSaving = false,
  isDeletePending = false,
  isRatingPending = false,
  isVotingMode = false,
  canMovePrevious = false,
  canMoveNext = false,
  navigationLoading = false,
  navigationError = false,
  onRetryNavigation,
  onImageNavigate,
}: DayModalProps) {
  const { user } = useAuth()
  const remoteImage = useMealImage(day.hasImage ? day.recordId : undefined)
  const imageChanged = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const canEdit = day.status === "empty" || day.recordedByUserId === user?.id
  const isBusy = isSaving || isDeletePending
  const ratingKey = day.recordId ?? day.date.toISOString()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const getSuggestedTeam = (date: Date): "A" | "B" => {

    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    const isEvenWeek = weekNo % 2 === 0;
    const day = date.getDay();

    const isWeekendSide = [1, 2, 5, 6, 0].includes(day);

    if (isEvenWeek) {
      return isWeekendSide ? "B" : "A";
    } else {
      return isWeekendSide ? "A" : "B";
    }
  }

  const [showEditForm, setShowEditForm] = useState(false)
  const previousDayKey = useRef(ratingKey)

  const [hadFood, setHadFood] = useState<boolean | null>(
    day.status === "volt" ? true : day.status === "nem" ? false : null,
  )
  const [details, setDetails] = useState(day.food || day.reason || "")
  const [team, setTeam] = useState<"A" | "B">(day.team || getSuggestedTeam(day.date))
  const [mealImageUrl, setMealImageUrl] = useState("")
  const [imageError, setImageError] = useState<string | null>(null)
  const [isPreparingImage, setIsPreparingImage] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const dragOffsetRef = useRef(0)
  const dragDismissThreshold = 400

  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY
    dragOffsetRef.current = 0
    setDragOffset(0)
  }
  const handleDragMove = (clientY: number) => {
    if (dragStartY.current === null) return
    const delta = clientY - dragStartY.current
    const nextOffset = Math.max(0, delta)
    dragOffsetRef.current = nextOffset
    setDragOffset(nextOffset)
  }
  const handleDragEnd = () => {
    const shouldDismiss = dragOffsetRef.current >= dragDismissThreshold
    dragStartY.current = null
    dragOffsetRef.current = 0

    if (shouldDismiss) {
      onClose()
    } else {
      setDragOffset(0)
    }
  }

  // Keep the dialog shell mounted while paging. Only record-bound drafts and
  // transient states reset; scroll locking, focus and the entrance animation
  // belong to the lifetime of the open dialog, not the selected photo.
  useLayoutEffect(() => {
    if (previousDayKey.current === ratingKey) return
    previousDayKey.current = ratingKey
    imageChanged.current = false
    setHadFood(day.status === 'volt' ? true : day.status === 'nem' ? false : null)
    setDetails(day.food || day.reason || '')
    setTeam(day.team || getSuggestedTeam(day.date))
    setMealImageUrl('')
    setImageError(null)
    setIsPreparingImage(false)
    setIsDeleteConfirmOpen(false)
    setIsLightboxOpen(false)
    setShowEditForm(false)
    setDragOffset(0)
    dragStartY.current = null
    dragOffsetRef.current = 0
  }, [ratingKey, day.status, day.food, day.reason, day.team, day.date])

  useEffect(() => {
    if (!imageChanged.current && remoteImage.status === 'ready') setMealImageUrl(remoteImage.url || '')
  }, [ratingKey, remoteImage.status, remoteImage.url])

  useEffect(() => {
    const prev = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => { document.body.style.overflow = prev; previousFocus?.focus() }
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSave = () => {
    if (hadFood !== null) {
      const savedImage = imageChanged.current ? mealImageUrl : remoteImage.url || mealImageUrl
      onSave(day, hadFood, details, team || undefined, hadFood ? savedImage || undefined : undefined)
    }
  }

  const handleDeleteConfirm = () => {
    onDelete?.(day)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setImageError("Csak képfájl tölthető fel")
      return
    }

    const preparingDayKey = ratingKey
    setIsPreparingImage(true)
    setImageError(null)

    try {
      const nextImageUrl = await resizeImageToDataUrl(file)
      if (previousDayKey.current !== preparingDayKey) return

      if (nextImageUrl.length > 1_600_000) {
        throw new Error("A kép túl nagy lett mentéshez. Válassz kisebb képet.")
      }

      imageChanged.current = true
      setMealImageUrl(nextImageUrl)
    } catch (error) {
      if (previousDayKey.current === preparingDayKey) setImageError(error instanceof Error ? error.message : "Nem sikerült feldolgozni a képet")
    } finally {
      if (previousDayKey.current === preparingDayKey) setIsPreparingImage(false)
      event.target.value = ""
    }
  }

  const handleHadFoodChange = (nextValue: boolean) => {
    setHadFood(nextValue)
    if (!nextValue) {
      imageChanged.current = true
      setMealImageUrl("")
      setImageError(null)
    }
  }

  const handleOpenImage = () => {
    if (!mealImageUrl) {
      return
    }

    try {
      openImageInCurrentTab(mealImageUrl)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Nem sikerült megnyitni a képet")
    }
  }

  const isImageLessVotingCard = isVotingMode && !day.hasImage

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) { event.preventDefault(); onClose(); return }
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, [tabindex="0"]')
        if (!controls?.length) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          event.preventDefault(); last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
          event.preventDefault(); first.focus()
        }
      }
      if (showEditForm || isBusy || isRatingPending || navigationLoading) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [role="combobox"]')) return
      if (event.key === 'ArrowLeft' && canMovePrevious) { event.preventDefault(); onImageNavigate?.('previous') }
      if (event.key === 'ArrowRight' && canMoveNext) { event.preventDefault(); onImageNavigate?.('next') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canMoveNext, canMovePrevious, isBusy, isRatingPending, navigationLoading, onClose, onImageNavigate, showEditForm])

  const imageNotReady = Boolean(day.hasImage && !imageChanged.current && remoteImage.status !== 'ready')

  // Full-size image viewer modal by default when there is an image
  if ((day.hasImage || isVotingMode) && !showEditForm) {
    return (
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Étkezés" tabIndex={-1} className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div
          className="relative w-full max-w-md rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden bg-black"
          style={{
            transform: `translateY(${dragOffset}px)`,
            transition: dragStartY.current !== null ? 'none' : 'transform 0.3s ease'
          }}
        >
          {/* Drag handle */}
          <div
            className="absolute top-0 inset-x-0 z-20 flex justify-center pt-3 pb-5 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
            onTouchCancel={handleDragEnd}
            onMouseDown={(e) => handleDragStart(e.clientY)}
            onMouseMove={(e) => e.buttons === 1 && handleDragMove(e.clientY)}
            onMouseUp={handleDragEnd}
          >
            <div className="w-10 h-1 rounded-full bg-white/60 shadow" />
          </div>

          {/* Hero image */}
          <div
            className={`relative overflow-hidden ${isImageLessVotingCard ? "bg-emerald-50" : "bg-black"}`}
            style={{ height: "min(70vh, 133.333vw)" }}
          >
            {day.hasImage && day.recordId ? (
              <MealPhoto key={day.recordId} recordId={day.recordId} />
            ) : (
              <div className="h-full w-full bg-emerald-50" aria-label="Ehhez az étkezéshez nincs feltöltött kép" />
            )}

            {(navigationLoading || canMovePrevious || canMoveNext) && (
              <>
                <button
                  type="button"
                  disabled={!canMovePrevious || navigationLoading || isRatingPending}
                  onClick={() => onImageNavigate?.("previous")}
                  aria-label="Előző kép"
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 w-11 h-11 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center transition hover:bg-black/65 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  disabled={!canMoveNext || navigationLoading || isRatingPending}
                  onClick={() => onImageNavigate?.("next")}
                  aria-label="Következő kép"
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 w-11 h-11 rounded-full bg-black/45 text-white backdrop-blur-sm flex items-center justify-center transition hover:bg-black/65 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* top dark fade for drag handle visibility */}
            <div className={`absolute top-0 inset-x-0 h-16 pointer-events-none z-10 ${isImageLessVotingCard ? "bg-gradient-to-b from-emerald-100/60 to-transparent" : "bg-gradient-to-b from-black/50 to-transparent"}`} />
            {/* bottom info overlay */}
            <div className={`absolute bottom-0 inset-x-0 p-5 pt-16 z-10 ${isImageLessVotingCard ? "bg-emerald-50" : "bg-gradient-to-t from-black/90 via-black/50 to-transparent"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={isImageLessVotingCard ? "text-gray-700 text-xs mb-1" : "text-white/70 text-xs mb-1"}>{formatDate(day.date)}</p>
                  {day.food && (
                    <h2 className={isImageLessVotingCard ? "text-gray-900 font-bold text-xl leading-tight break-words" : "text-white font-bold text-xl leading-tight break-words"}>{day.food}</h2>
                  )}
                  {day.recordedBy && (
                    <p className={isImageLessVotingCard ? "text-gray-600 text-xs mt-1.5" : "text-white/60 text-xs mt-1.5"}>{day.recordedBy}{day.recordedAt ? ` · ${day.recordedAt}` : ""}</p>
                  )}
                </div>
                {day.team && (
                  <div className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow ${day.team === "A" ? "bg-blue-600 text-white" : "bg-pink-600 text-white"}`}>
                    {day.team === "A" ? "Zs csapat" : "R csapat"}
                  </div>
                )}
              </div>
              {day.status === "volt" && (
                <div className="mt-3">
                  <MealRatingControl key={ratingKey} day={day} onRate={onRate} isPending={isRatingPending} overlay />
                </div>
              )}
            </div>
          </div>

          {navigationError && (
            <div role="alert" className="bg-white px-5 pt-3 text-sm text-rose-700">
              Nem sikerült betölteni a lapozást. <button type="button" onClick={onRetryNavigation} className="underline">Újrapróbálás</button>
            </div>
          )}
          {/* Buttons */}
          <div className="bg-white px-5 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Bezárás
            </button>
            {canEdit && (
              <button
                onClick={() => setShowEditForm(true)}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Szerkesztés
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Étkezés" tabIndex={-1} className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isBusy ? undefined : onClose} />

      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragStartY.current !== null ? 'none' : 'transform 0.3s ease'
        }}
      >
        <div
          className="flex justify-center pt-3 pb-3 sticky top-0 bg-white z-10 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => e.buttons === 1 && handleDragMove(e.clientY)}
          onMouseUp={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1F2937]">Kaja rögzítése</h2>
              <button
            disabled={isBusy}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center pb-2">
            <p className="text-sm text-[#6B7280]">Kiválasztott nap</p>
            <p className="text-xl font-semibold text-[#1F2937]">{formatDate(day.date)}</p>
          </div>

          {day.status === "volt" && (
            <MealRatingControl key={ratingKey} day={day} onRate={onRate} isPending={isRatingPending} compact />
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#1F2937]">Volt személyzeti étkezés ezen a napon?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={!canEdit || isBusy}
                aria-pressed={hadFood === true}
                onClick={() => handleHadFoodChange(true)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${hadFood === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-[#E5E7EB] hover:border-emerald-300 text-[#6B7280]"
                  } ${!canEdit || isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Check className="w-5 h-5" />
                <span className="font-medium">Igen</span>
              </button>
              <button
                disabled={!canEdit || isBusy}
                aria-pressed={hadFood === false}
                onClick={() => handleHadFoodChange(false)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${hadFood === false
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-[#E5E7EB] hover:border-rose-300 text-[#6B7280]"
                  } ${!canEdit || isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <XIcon className="w-5 h-5" />
                <span className="font-medium">Nem</span>
              </button>
            </div>
          </div>

          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="details" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Mit ettünk?" : "Miért nem volt kaja?"}
              </Label>
              <Input
                id="details"
                disabled={!canEdit || isBusy}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={hadFood ? "Pl. Csirkepaprikás" : "Pl. Szabadnap"}
                className={`h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500 ${!canEdit || isBusy ? "bg-gray-50 text-gray-400" : ""}`}
              />
            </div>
          )}

          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="team" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Melyik csapattól kaptuk?" : "Melyik csapat dolgozik ezen a napon?"}
              </Label>
              <Select disabled={!canEdit || isBusy} value={team || ""} onValueChange={(value) => setTeam(value as "A" | "B")}>
                <SelectTrigger className={`w-full h-12 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer bg-white ${!canEdit || isBusy ? "bg-gray-50 text-gray-400" : ""}`}>
                  <SelectValue placeholder="Válassz csapatot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Zs csapat</SelectItem>
                  <SelectItem value="B">R csapat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {hadFood === true && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium text-[#1F2937]">Kép az ételről</Label>
                {canEdit && mealImageUrl && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      imageChanged.current = true
                      setMealImageUrl("")
                      setImageError(null)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash className="w-3 h-3" />
                    Kép törlése
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={!canEdit || isBusy}
              />

              {canEdit && (
                <button
                  type="button"
                  disabled={isBusy || isPreparingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-12 rounded-xl border-2 border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937] hover:bg-[#F3F4F6] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${isBusy || isPreparingImage ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <ImagePlus className="w-4 h-4" />
                  <span className="text-sm font-medium">{isPreparingImage ? "Kép előkészítése..." : mealImageUrl ? "Kép cseréje" : "Kép feltöltése"}</span>
                </button>
              )}

              {imageNotReady && (
                <p role="status" className="text-sm text-gray-600">
                  {remoteImage.status === 'error' ? <>Nem sikerült betölteni a meglévő képet. <button type="button" onClick={remoteImage.retry} className="underline">Újrapróbálás</button></> : 'Meglévő kép betöltése...'}
                </p>
              )}
              {imageError && (
                <p className="text-xs text-rose-600">{imageError}</p>
              )}

              {mealImageUrl && (
                <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-black/5">
                  <img
                    src={mealImageUrl}
                    alt="Feltöltött ételfotó"
                    className="block w-full h-auto max-h-[320px] object-cover pointer-events-none"
                  />
                </div>
              )}

              {isLightboxOpen && mealImageUrl && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  <img
                    src={mealImageUrl}
                    alt="Ételfotó"
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          )}

          {!canEdit && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
              <XIcon className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Ezt a bejegyzést <span className="font-semibold">{day.recordedBy}</span> hozta létre. Csak ő módosíthatja.
              </p>
            </div>
          )}

          <p className="text-xs text-[#9CA3AF] text-center">
            Egy naphoz egy bejegyzés tartozik.
          </p>
        </div>
        <div className="px-6 pb-6 pt-2 space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="flex-1 h-12 rounded-xl border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] bg-transparent cursor-pointer"
            >
              Mégse
            </Button>
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={hadFood === null || isBusy || isPreparingImage || imageNotReady}
                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer inline-flex items-center justify-center"
              >
                {isSaving ? <Spinner className="size-4 text-white" /> : "Mentés"}
              </Button>
            )}
          </div>
          {canEdit && day.status !== "empty" && (
            isDeleteConfirmOpen ? (
              <div className="space-y-3 p-4 bg-rose-50/50 rounded-xl border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-sm text-center text-rose-800 font-medium">Biztosan törölni szeretnéd a bejegyzést?</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isBusy}
                    className="flex-1 h-10 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-100 bg-transparent cursor-pointer"
                  >
                    Mégse
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={isBusy}
                    className="flex-1 h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer inline-flex items-center justify-center"
                  >
                    {isDeletePending ? <Spinner className="size-4 text-white" /> : "Végleges törlés"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isBusy}
                className="w-full h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-transparent cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Törlés
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

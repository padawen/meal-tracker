'use client'

import { useState } from 'react'
import { deleteMealAction, saveMealAction, saveMealRatingAction } from '@/app/actions/meal-actions'
import type { MealDayData } from '@/lib/meal-domain'
import { formatDateOnly } from '@/lib/utils'
import { useMealDataContext } from './MealDataContext'

interface Options {
  setSelectedDay: (day: MealDayData | null) => void
  toast: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
  userId: string
}

export function useMealTableMutations({ setSelectedDay, toast, userId }: Options) {
  const { cache, images } = useMealDataContext()
  const [confettiVariant, setConfettiVariant] = useState<'celebration' | 'sad' | null>(null)
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | 'rate' | null>(null)
  const fail = (description: string) => toast({ title: 'Hiba', description, variant: 'destructive' })
  const handleSave = async (day: MealDayData, hadFood: boolean, details: string, team?: 'A' | 'B', mealImageUrl?: string | null) => {
    setPendingAction('save')
    try {
      const date = formatDateOnly(day.date)
      const response = await saveMealAction({ date, had_meal: hadFood, meal_name: hadFood ? details : null,
        meal_image_url: hadFood ? mealImageUrl : null, reason: hadFood ? null : details, team: team || null })
      if (!response.success) {
        if ('conflict' in response && response.conflict) {
          setSelectedDay(null)
          void cache.refresh(date).catch(console.error)
        }
        fail(response.error || 'Nem sikerült menteni az adatokat')
        return
      }
      const id = response.recordId || day.recordId
      cache.update(date, { id, date, had_meal: hadFood, meal_name: hadFood ? details : null,
        reason: hadFood ? null : details, has_image: hadFood && (mealImageUrl === undefined ? Boolean(day.hasImage) : Boolean(mealImageUrl)), team: team || null,
        recorded_by: userId, created_at: response.timestamp || new Date().toISOString(),
        ...(hadFood ? {} : { rating_count: 0, rating_sum: 0, rating_average: null, my_rating: null }) })
      if (id && (!hadFood || mealImageUrl !== undefined)) images.seed(id, hadFood ? mealImageUrl || null : null)
      setConfettiVariant(hadFood ? 'celebration' : 'sad')
      setTimeout(() => setConfettiVariant(null), 3000)
      toast({ title: 'Sikeres mentés', description: 'Frissítve' })
      setSelectedDay(null)
    } catch { fail('Nem sikerült menteni az adatokat') } finally { setPendingAction(null) }
  }
  const handleDelete = async (day: MealDayData) => {
    setPendingAction('delete')
    try {
      const date = formatDateOnly(day.date)
      const response = await deleteMealAction(date)
      if (!response.success) { fail(response.error || 'Nem sikerült törölni a rekordot'); return }
      cache.update(date, null)
      if (day.recordId) images.invalidate(day.recordId)
      toast({ title: 'Törölve', description: 'A rekord sikeresen törölve lett.' })
      setSelectedDay(null)
    } catch { fail('Nem sikerült törölni a rekordot') } finally { setPendingAction(null) }
  }
  const handleRate = async (day: MealDayData, rating: number) => {
    if (!day.recordId || day.myRating) return
    setPendingAction('rate')
    try {
      const response = await saveMealRatingAction(day.recordId, rating)
      if (!response.success) { fail(response.error || 'Nem sikerült menteni az értékelést'); return }
      const date = formatDateOnly(day.date)
      // The acknowledgement and Realtime can arrive in either order. Apply our
      // vote once, then reconcile with the server without blocking the dialog.
      cache.update(date, (current) => {
        if (!current || current.my_rating) return current || null
        const count = (current.rating_count || 0) + 1
        const sum = (current.rating_sum || 0) + rating
        return { ...current, my_rating: rating, rating_count: count, rating_sum: sum, rating_average: sum / count }
      })
      void cache.refresh(date).catch(console.error)
      toast({ title: 'Köszönjük!', description: 'Az értékelésed rögzítve lett.' })
    } catch { fail('Nem sikerült frissíteni az értékelést. Próbáld újra.') } finally { setPendingAction(null) }
  }
  return { confettiVariant, handleDelete, handleSave, handleRate, pendingAction }
}

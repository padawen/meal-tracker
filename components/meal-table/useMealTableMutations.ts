'use client'

import { useState, useTransition } from 'react'

import { deleteMealAction, saveMealAction, saveMealRatingAction } from '@/app/actions/meal-actions'
import type { MealDayData } from '@/lib/meal-domain'

interface MealTableMutationOptions {
  allRecords: MealDayData[]
  currentUserName: string
  formatDateStr: (date: Date) => string
  setAllRecords: (records: MealDayData[]) => void
  setSelectedDay: (day: MealDayData | null) => void
  toast: (options: {
    title: string
    description: string
    variant?: 'default' | 'destructive'
  }) => void
  userId: string
}

function formatTimestamp(timestamp?: string) {
  const date = timestamp ? new Date(timestamp) : new Date()
  return date
    .toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/-/g, '.')
}

export function useMealTableMutations({
  allRecords,
  currentUserName,
  formatDateStr,
  setAllRecords,
  setSelectedDay,
  toast,
  userId,
}: MealTableMutationOptions) {
  const [confettiVariant, setConfettiVariant] = useState<'celebration' | 'sad' | null>(null)
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | 'rate' | null>(null)
  const [, startTransition] = useTransition()

  const triggerConfetti = (variant: 'celebration' | 'sad') => {
    setConfettiVariant(variant)
    setTimeout(() => setConfettiVariant(null), 3000)
  }

  const handleSave = async (
    dayData: MealDayData,
    hadFood: boolean,
    details: string,
    team?: 'A' | 'B',
    mealImageUrl?: string
  ) => {
    const dateStr = formatDateStr(dayData.date)

    setPendingAction('save')
    startTransition(async () => {
      try {
        const response = await saveMealAction({
          date: dateStr,
          had_meal: hadFood,
          meal_name: hadFood ? details : null,
          meal_image_url: hadFood ? mealImageUrl || null : null,
          reason: !hadFood ? details : null,
          team: team || null,
        })

        if (!response.success && response.error) {
          if ('conflict' in response && response.conflict) {
            setSelectedDay(null)
          }
          toast({ title: 'Figyelem', description: response.error, variant: 'destructive' })
          return
        }

        const savedTimestamp = 'timestamp' in response ? response.timestamp : undefined
        const savedRecordId = 'recordId' in response ? response.recordId : undefined

        triggerConfetti(hadFood ? 'celebration' : 'sad')

        const indexToUpdate = allRecords.findIndex((record) => formatDateStr(record.date) === dateStr)
        if (indexToUpdate !== -1) {
          const updatedRecords = [...allRecords]
          updatedRecords[indexToUpdate] = {
            ...updatedRecords[indexToUpdate],
            recordId: savedRecordId || updatedRecords[indexToUpdate].recordId,
            status: hadFood ? 'volt' : 'nem',
            food: hadFood ? details : undefined,
            mealImageUrl: hadFood ? mealImageUrl : undefined,
            reason: !hadFood ? details : undefined,
            team,
            recordedBy: currentUserName,
            recordedByUserId: userId,
            recordedAt: formatTimestamp(savedTimestamp),
            ratingAverage: hadFood ? updatedRecords[indexToUpdate].ratingAverage : undefined,
            ratingCount: hadFood ? updatedRecords[indexToUpdate].ratingCount : 0,
            ratingSum: hadFood ? updatedRecords[indexToUpdate].ratingSum : 0,
            myRating: hadFood ? updatedRecords[indexToUpdate].myRating : undefined,
          }
          setAllRecords(updatedRecords)
        }

        toast({ title: 'Sikeres mentés', description: 'Frissítve' })
        setSelectedDay(null)
      } catch (error) {
        console.error('Error saving meal record:', error)
        toast({ title: 'Hiba', description: 'Nem sikerült menteni az adatokat', variant: 'destructive' })
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleDelete = async (dayData: MealDayData) => {
    const dateStr = formatDateStr(dayData.date)

    setPendingAction('delete')
    startTransition(async () => {
      try {
        const response = await deleteMealAction(dateStr)

        if (!response.success && response.error) {
          toast({ title: 'Figyelem', description: response.error, variant: 'destructive' })
          return
        }

        const indexToUpdate = allRecords.findIndex((record) => formatDateStr(record.date) === dateStr)
        if (indexToUpdate !== -1) {
          const updatedRecords = [...allRecords]
          updatedRecords[indexToUpdate] = {
            ...updatedRecords[indexToUpdate],
            status: 'empty',
            recordId: undefined,
            food: undefined,
            mealImageUrl: undefined,
            reason: undefined,
            team: undefined,
            recordedBy: undefined,
            recordedByUserId: undefined,
            recordedAt: undefined,
            ratingAverage: undefined,
            ratingCount: 0,
            ratingSum: 0,
            myRating: undefined,
          }
          setAllRecords(updatedRecords)
        }

        toast({ title: 'Törölve', description: 'A rekord sikeresen törölve lett.' })
        setSelectedDay(null)
      } catch (error) {
        console.error('Error deleting meal record:', error)
        toast({ title: 'Hiba', description: 'Nem sikerült törölni a rekordot', variant: 'destructive' })
      } finally {
        setPendingAction(null)
      }
    })
  }

  const handleRate = async (dayData: MealDayData, rating: number) => {
    if (!dayData.recordId || dayData.myRating) return

    setPendingAction('rate')
    startTransition(async () => {
      try {
        const response = await saveMealRatingAction(dayData.recordId!, rating)
        if (!response.success) {
          toast({ title: 'Figyelem', description: response.error || 'Nem sikerült menteni az értékelést', variant: 'destructive' })
          return
        }

        const indexToUpdate = allRecords.findIndex((record) => record.recordId === dayData.recordId)
        if (indexToUpdate !== -1) {
          const updatedRecords = [...allRecords]
          const current = updatedRecords[indexToUpdate]
          const nextCount = (current.ratingCount || 0) + 1
          const nextSum = (current.ratingSum || 0) + rating
          updatedRecords[indexToUpdate] = {
            ...current,
            ratingCount: nextCount,
            ratingSum: nextSum,
            ratingAverage: nextSum / nextCount,
            myRating: rating,
          }
          setAllRecords(updatedRecords)
        }
        toast({ title: 'Köszönjük!', description: 'Az értékelésed rögzítve lett.' })
      } catch (error) {
        console.error('Error saving meal rating:', error)
        toast({ title: 'Hiba', description: 'Nem sikerült menteni az értékelést', variant: 'destructive' })
      } finally {
        setPendingAction(null)
      }
    })
  }

  return {
    confettiVariant,
    handleDelete,
    handleSave,
    handleRate,
    pendingAction,
  }
}

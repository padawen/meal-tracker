"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Calendar, Flame, BarChart3, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function Statistics() {
  const [loading, setLoading] = useState(true)
  const [weeklyData, setWeeklyData] = useState<Array<{ day: string; volt: number; nem: number }>>([])
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; volt: number; nem: number }>>([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [yearlyStats, setYearlyStats] = useState<{ year: number; count: number }>({ year: 2026, count: 0 })

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        // Fetch all records from 2026 onwards
        const { data: records, error } = await supabase
          .from('meal_records')
          .select('date, had_meal')
          .gte('date', '2026-01-01')
          .order('date', { ascending: true })
          .returns<Array<{ date: string; had_meal: boolean }>>()

        if (error) throw error

        if (!records || records.length === 0) {
          setLoading(false)
          return
        }

        // Calculate weekly data (current week)
        const today = new Date()
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() + diff)
        startOfWeek.setHours(0, 0, 0, 0)

        const weekDays = ['H', 'K', 'Sz', 'Cs', 'P', 'Szo', 'V']
        const weekly = weekDays.map((day, index) => {
          const date = new Date(startOfWeek)
          date.setDate(startOfWeek.getDate() + index)
          const dateStr = date.toISOString().split('T')[0]

          const record = records.find(r => r.date === dateStr)
          return {
            day,
            volt: record?.had_meal ? 1 : 0,
            nem: record && !record.had_meal ? 1 : 0
          }
        })
        setWeeklyData(weekly)

        // Calculate monthly data (last 6 months from 2026)
        const monthNames = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec']
        const currentMonth = today.getMonth()
        const currentYear = today.getFullYear()

        const monthly = []
        for (let i = 5; i >= 0; i--) {
          const month = currentMonth - i
          const year = month < 0 ? currentYear - 1 : currentYear
          const adjustedMonth = month < 0 ? 12 + month : month

          // Only show data from 2026 onwards
          if (year < 2026) continue

          const monthRecords = records.filter(r => {
            const recordDate = new Date(r.date)
            return recordDate.getMonth() === adjustedMonth && recordDate.getFullYear() === year
          })

          monthly.push({
            month: monthNames[adjustedMonth],
            volt: monthRecords.filter(r => r.had_meal).length,
            nem: monthRecords.filter(r => !r.had_meal).length
          })
        }
        setMonthlyData(monthly)

        // Calculate streaks
        let current = 0
        let longest = 0
        let tempStreak = 0

        const sortedRecords = [...records].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )

        // Current streak (from today backwards)
        for (const record of sortedRecords) {
          if (record.had_meal) {
            current++
          } else {
            break
          }
        }

        // Longest streak
        for (const record of records) {
          if (record.had_meal) {
            tempStreak++
            longest = Math.max(longest, tempStreak)
          } else {
            tempStreak = 0
          }
        }

        setCurrentStreak(current)
        setLongestStreak(longest)

        // Yearly stats (2026)
        const yearRecords = records.filter(r => {
          const recordDate = new Date(r.date)
          return recordDate.getFullYear() === 2026
        })
        setYearlyStats({
          year: 2026,
          count: yearRecords.filter(r => r.had_meal).length
        })

      } catch (error) {
        console.error('Error fetching statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [])

  const maxMonthly = Math.max(...monthlyData.map((d) => d.volt + d.nem), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1F2937]">Statisztikák</h1>
            <p className="text-sm text-[#6B7280]">Étkezési adatok áttekintése (2026-tól)</p>
          </div>
        </div>
      </div>

      {/* Streak Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Aktuális sorozat</p>
              <p className="text-2xl font-bold text-[#1F2937]">{currentStreak} nap</p>
            </div>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Folytatódik!</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Leghosszabb sorozat</p>
              <p className="text-2xl font-bold text-[#1F2937]">{longestStreak} nap</p>
            </div>
          </div>
          <p className="text-xs text-[#6B7280]">2026</p>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#1F2937] mb-4">Heti összesítés</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyData.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col gap-1">
                {day.volt > 0 && (
                  <div
                    className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300"
                    style={{ height: `${day.volt * 60}px` }}
                  />
                )}
                {day.nem > 0 && (
                  <div
                    className="w-full bg-rose-500 rounded-t-lg transition-all duration-300"
                    style={{ height: `${day.nem * 60}px` }}
                  />
                )}
                {day.volt === 0 && day.nem === 0 && <div className="w-full bg-[#E5E7EB] rounded-t-lg h-2" />}
              </div>
              <span className="text-xs font-medium text-[#6B7280]">{day.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-xs text-[#6B7280]">Volt kaja</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-rose-500" />
            <span className="text-xs text-[#6B7280]">Nem volt</span>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#1F2937] mb-4">Havi összesítés</h2>
          <div className="flex items-end justify-between gap-3 h-40">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-0.5" style={{ height: "120px" }}>
                  <div
                    className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300"
                    style={{ height: `${(month.volt / maxMonthly) * 100}%` }}
                  />
                  <div
                    className="w-full bg-rose-500 rounded-b-lg transition-all duration-300"
                    style={{ height: `${(month.nem / maxMonthly) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#6B7280]">{month.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yearly Overview */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#1F2937] mb-4">Éves áttekintés</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium mb-1">{yearlyStats.year}</p>
            <p className="text-2xl font-bold text-emerald-800">{yearlyStats.count} nap</p>
            <p className="text-xs text-emerald-600">volt kaja</p>
          </div>
        </div>
      </div>
    </div>
  )
}

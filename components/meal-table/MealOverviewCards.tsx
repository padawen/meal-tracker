import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'

import { PeriodStatsCard } from '@/components/shared'
import type { MealDayData } from '@/lib/meal-domain'
import type { PeriodStats } from '@/lib/stats-utils'

interface MealOverviewCardsProps {
  allRecords: MealDayData[]
  monthStats: PeriodStats
  today: Date
  totalEmptyDays: number
  weekStats: PeriodStats
}

function getEmptyEmoji(totalEmptyDays: number) {
  if (totalEmptyDays === 0) return '😊'
  if (totalEmptyDays === 1) return '😕'
  if (totalEmptyDays === 2) return '😟'
  return '😢'
}

function hasOnlyTodayMissing(allRecords: MealDayData[], today: Date) {
  return allRecords.some(
    (record) =>
      record.date.getDate() === today.getDate() &&
      record.date.getMonth() === today.getMonth() &&
      record.date.getFullYear() === today.getFullYear() &&
      record.status === 'empty' &&
      !record.isHoliday
  )
}

export function MealOverviewCards({
  allRecords,
  monthStats,
  today,
  totalEmptyDays,
  weekStats,
}: MealOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <PeriodStatsCard
        title="Ez a hét"
        stats={weekStats}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        iconBgColor="bg-emerald-100"
      />
      <PeriodStatsCard
        title="Ez a hónap"
        stats={monthStats}
        icon={<Calendar className="w-5 h-5 text-indigo-600" />}
        iconBgColor="bg-indigo-100"
      />
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalEmptyDays === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {totalEmptyDays === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            {totalEmptyDays === 0 ? (
              <>
                <p className="text-xs text-[#6B7280] font-medium">Gratulálunk!</p>
                <p className="text-lg font-semibold text-[#1F2937]">Minden kitöltve!</p>
              </>
            ) : totalEmptyDays === 1 && hasOnlyTodayMissing(allRecords, today) ? (
              <>
                <p className="text-xs text-[#6B7280] font-medium">Már csak egy!</p>
                <p className="text-lg font-semibold text-[#1F2937]">Csak a mai hiányzik!</p>
              </>
            ) : (
              <>
                <p className="text-xs text-[#6B7280] font-medium">Kitöltetlen</p>
                <p className="text-lg font-semibold text-[#1F2937]">{totalEmptyDays} nap</p>
              </>
            )}
          </div>
          <div className="text-2xl">{totalEmptyDays === 0 ? '🥳' : getEmptyEmoji(totalEmptyDays)}</div>
        </div>
      </div>
    </div>
  )
}

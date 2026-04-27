import { useMemo } from "react"
import { History } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { UserLeaderboard, UserStat } from "./UserLeaderboard"
import { UserCompletionRatio } from "./UserCompletionRatio"
import { YearlySummaryCard } from "./YearlySummaryCard"
import { HistoryMonthCard } from "./HistoryMonthCard"
import type { HolidayRow, MealRecordRow, ProfileSummary } from "@/lib/meal-domain"
import {
    buildHistoryMonthlyStats,
    buildHistoryYearSummary,
    buildUserStatsFromRecords,
    summarizeHistoryMonthlyStats,
} from "@/lib/statistics-domain"
import { parseDateOnly } from "@/lib/utils"

interface HistoryTabProps {
    historyYear: string
    setHistoryYear: (year: string) => void
    historyYears: string[]
    rawRecords: MealRecordRow[]
    holidays: HolidayRow[]
    allUsers: Map<string, ProfileSummary>
}

export function HistoryTab({ historyYear, setHistoryYear, historyYears, rawRecords, holidays, allUsers }: HistoryTabProps) {
    const today = new Date()

    const historyMonthlyStats = useMemo(() => {
        return buildHistoryMonthlyStats(historyYear, today, rawRecords, holidays)
    }, [historyYear, holidays, rawRecords, today])

    const yearUserStats = useMemo(() => {
        const yearRecords = rawRecords.filter((record) => parseDateOnly(record.date).getFullYear().toString() === historyYear)
        return buildUserStatsFromRecords(yearRecords, allUsers)
    }, [historyYear, rawRecords, allUsers])

    const historyYearStats = useMemo(() => {
        return buildHistoryYearSummary(historyYear, today, holidays)
    }, [historyYear, holidays, today]);

    const yearlyTotals = useMemo(() => summarizeHistoryMonthlyStats(historyMonthlyStats), [historyMonthlyStats])

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        Előzmények
                    </h2>
                    <Select value={historyYear} onValueChange={setHistoryYear}>
                        <SelectTrigger className="w-[100px] cursor-pointer">
                            <SelectValue placeholder="Év" />
                        </SelectTrigger>
                        <SelectContent>
                            {historyYears.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4">
                    {historyMonthlyStats.length > 0 ? (
                        historyMonthlyStats.map((stat, idx) => <HistoryMonthCard key={idx} stat={stat} />)
                    ) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Nincs megjeleníthető adat erre az évre.
                        </div>
                    )}
                </div>
            </div>

            {historyMonthlyStats.length > 0 && (() => {
                return (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                        <h3 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                            <span className="text-indigo-600">📊</span>
                            Éves összesítő
                        </h3>
                        <YearlySummaryCard
                            title={historyYear}
                            teamAHad={yearlyTotals.teamAHad}
                            teamANo={yearlyTotals.teamANo}
                            teamBHad={yearlyTotals.teamBHad}
                            teamBNo={yearlyTotals.teamBNo}
                            totalHad={yearlyTotals.totalHad}
                            totalNo={yearlyTotals.totalNo}
                            holidays={yearlyTotals.totalHolidays}
                        />
                    </div>
                )
            })()}

            {yearUserStats.length > 0 && (
                <>
                    <UserLeaderboard userStats={yearUserStats} title="Legjobb kitöltők" />
                    <UserCompletionRatio
                        userStats={yearUserStats}
                        elapsedDays={historyYearStats.elapsedDays}
                        totalDays={historyYearStats.totalDays}
                        elapsedHolidays={historyYearStats.elapsedHolidays}
                        totalHolidays={historyYearStats.totalHolidays}
                        isCurrentYear={historyYearStats.isCurrentYear}
                    />
                </>
            )}
        </div>
    )
}

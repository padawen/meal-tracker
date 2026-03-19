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

interface HistoryTabProps {
    historyYear: string
    setHistoryYear: (year: string) => void
    historyYears: string[]
    rawRecords: Array<{ date: string; had_meal: boolean; team: string | null; recorded_by: string }>
    holidays: Array<{ date: string; name: string }>
    allUsers: Map<string, { full_name: string | null; email: string }>
}

export function HistoryTab({ historyYear, setHistoryYear, historyYears, rawRecords, holidays, allUsers }: HistoryTabProps) {
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December']
    const today = new Date()

    const formatDateStr = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const historyMonthlyStats = useMemo(() => {
        const yearRecords = rawRecords.filter(r => new Date(r.date).getFullYear().toString() === historyYear)
        const yearHolidays = holidays.filter(h => new Date(h.date).getFullYear().toString() === historyYear)
        const stats = []

        for (let i = 0; i < 12; i++) {
            const monthStart = new Date(Number(historyYear), i, 1)
            const monthEnd = new Date(Number(historyYear), i + 1, 0)

            let currentDate = new Date(monthStart)
            let unfilledCount = 0

            while (currentDate <= monthEnd) {
                const isFuture = currentDate > today
                if (!isFuture) {
                    const dStr = formatDateStr(currentDate)
                    const hasRecord = yearRecords.some(r => r.date === dStr)
                    const isHoliday = yearHolidays.some(h => h.date === dStr)

                    if (!hasRecord && !isHoliday) {
                        unfilledCount++
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1)
            }

            const monthRecs = yearRecords.filter(r => new Date(r.date).getMonth() === i)
            const visibleHolidays = yearHolidays.filter(h => {
                const d = new Date(h.date)
                return d.getMonth() === i
            }).length

            const totalHad = monthRecs.filter(r => r.had_meal).length
            const totalNo = monthRecs.filter(r => !r.had_meal).length

            let elapsedDaysInMonth = 0
            const monthEndDate = monthEnd < today ? monthEnd : today
            if (monthStart <= today) {
                let countDate = new Date(monthStart)
                while (countDate <= monthEndDate && countDate <= monthEnd) {
                    elapsedDaysInMonth++
                    countDate.setDate(countDate.getDate() + 1)
                }
            }

            const hasData = (monthRecs.length > 0) || (visibleHolidays > 0)

            if (hasData) {
                stats.push({
                    name: monthNames[i],
                    teamA: { had: monthRecs.filter(r => r.team === 'A' && r.had_meal).length, no: monthRecs.filter(r => r.team === 'A' && !r.had_meal).length },
                    teamB: { had: monthRecs.filter(r => r.team === 'B' && r.had_meal).length, no: monthRecs.filter(r => r.team === 'B' && !r.had_meal).length },
                    total: {
                        had: totalHad,
                        no: totalNo,
                        unfilled: unfilledCount,
                        holidays: visibleHolidays
                    },
                    daysInMonth: monthEnd.getDate(),
                    elapsedDays: elapsedDaysInMonth
                })
            }
        }
        return stats
    }, [historyYear, rawRecords, holidays])

    const yearUserStats = useMemo(() => {
        const yearRecords = rawRecords.filter(r => new Date(r.date).getFullYear().toString() === historyYear)
        const counts = new Map<string, number>()
        yearRecords.forEach(r => {
            counts.set(r.recorded_by, (counts.get(r.recorded_by) || 0) + 1)
        })

        const userIds = Array.from(counts.keys())
        return userIds.map(uid => {
            const profile = allUsers.get(uid)
            const fullName = profile?.full_name || profile?.email?.split('@')[0] || 'Névtelen'
            return {
                userId: uid,
                fullName,
                recordCount: counts.get(uid) || 0
            }
        }).sort((a, b) => b.recordCount - a.recordCount)
    }, [historyYear, rawRecords, allUsers])

    const historyYearStats = useMemo(() => {
        const yearInt = Number(historyYear);
        const isCurrentYear = yearInt === today.getFullYear();

        const startOfYear = new Date(yearInt, 0, 1);
        const endOfYear = new Date(yearInt, 11, 31);

        const totalDaysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        let elapsedDays;
        if (isCurrentYear) {
            elapsedDays = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        } else if (yearInt < today.getFullYear()) {
            elapsedDays = totalDaysInYear;
        } else {
            elapsedDays = 0;
        }

        const yearHolidays = holidays.filter(h => new Date(h.date).getFullYear() === yearInt);
        const elapsedHolidays = yearHolidays.filter(h => new Date(h.date) <= today).length;
        const totalHolidays = yearHolidays.length;

        return {
            elapsedDays,
            totalDays: totalDaysInYear,
            elapsedHolidays,
            totalHolidays,
            isCurrentYear
        };
    }, [historyYear, holidays]);

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
                        historyMonthlyStats.map((stat, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                <h3 className="font-semibold text-gray-900 mb-3">{stat.name}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                                        <span className="text-xs font-medium text-blue-700">Zs csapat</span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm font-semibold text-gray-700">{stat.teamA.had}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                                <span className="text-sm font-semibold text-gray-700">{stat.teamA.no}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-pink-50/50 border border-pink-100">
                                        <span className="text-xs font-medium text-pink-700">R csapat</span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm font-semibold text-gray-700">{stat.teamB.had}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                                <span className="text-sm font-semibold text-gray-700">{stat.teamB.no}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 flex-wrap gap-y-2">
                                        <span className="text-xs font-medium text-gray-500">Összesen ({stat.elapsedDays}/{stat.daysInMonth} nap)</span>
                                        <div className="flex items-center gap-3 flex-wrap justify-end">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm font-medium text-gray-700">{stat.total.had}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                                <span className="text-sm font-medium text-gray-700">{stat.total.no}</span>
                                            </div>
                                            {stat.total.unfilled > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                    <span className="text-sm font-medium text-gray-700">{stat.total.unfilled}</span>
                                                </div>
                                            )}
                                            {stat.total.holidays > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                    <span className="text-sm font-medium text-gray-700">{stat.total.holidays}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-dashed border-gray-200 flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> volt kaja</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> nem volt</span>
                                        {stat.total.unfilled > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> üres</span>}
                                        {stat.total.holidays > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> szünnap</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Nincs megjeleníthető adat erre az évre.
                        </div>
                    )}
                </div>
            </div>

            {historyMonthlyStats.length > 0 && (() => {
                const t = historyMonthlyStats.reduce((acc, stat) => ({
                    teamAHad: acc.teamAHad + stat.teamA.had,
                    teamANo: acc.teamANo + stat.teamA.no,
                    teamBHad: acc.teamBHad + stat.teamB.had,
                    teamBNo: acc.teamBNo + stat.teamB.no,
                    totalHad: acc.totalHad + stat.total.had,
                    totalNo: acc.totalNo + stat.total.no,
                    totalHolidays: acc.totalHolidays + stat.total.holidays,
                }), { teamAHad: 0, teamANo: 0, teamBHad: 0, teamBNo: 0, totalHad: 0, totalNo: 0, totalHolidays: 0 })
                return (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                        <h3 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                            <span className="text-indigo-600">📊</span>
                            Éves összesítő
                        </h3>
                        <YearlySummaryCard
                            title={historyYear}
                            teamAHad={t.teamAHad}
                            teamANo={t.teamANo}
                            teamBHad={t.teamBHad}
                            teamBNo={t.teamBNo}
                            totalHad={t.totalHad}
                            totalNo={t.totalNo}
                            holidays={t.totalHolidays}
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

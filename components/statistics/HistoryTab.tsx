import { useMemo } from "react"
import { History } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface HistoryTabProps {
    historyYear: string
    setHistoryYear: (year: string) => void
    historyYears: string[]
    rawRecords: Array<{ date: string; had_meal: boolean; team: string | null }>
    holidays: Array<{ date: string; name: string }>
}

export function HistoryTab({ historyYear, setHistoryYear, historyYears, rawRecords, holidays }: HistoryTabProps) {
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December']
    const today = new Date()

    // Format date helper
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

            // Only include month if it has any data (records or holidays)
            // OR if it's a month that has "unfilled" days (meaning it's in the past/present)
            // Actually, user asked: "csak azokat a honapokat mutasd ahol mar van felvive adat (kaja vagy unnepnap)"
            // So if (totalHad + totalNo + visibleHolidays) > 0 ? 
            // What about just 'unfilled'? If I just didn't fill anything for January, should it show?
            // "ahol mar van felvive adat" usually implies user action or system event exists.
            // If I just skipped January, it's "unfilled". 
            // Let's interpret strict: has records OR has holidays. Unfilled doesn't count as "felvive adat".
            // But if I have 20 unfilled days, I probably want to know.
            // However, user said "ahol van felvive adat (kaja vagy unnepnap)". 

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
                    daysInMonth: monthEnd.getDate()
                })
            }
        }
        return stats
    }, [historyYear, rawRecords, holidays])

    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Előzmények
                </h2>
                <Select value={historyYear} onValueChange={setHistoryYear}>
                    <SelectTrigger className="w-[100px]">
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
                                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/50 border border-purple-100">
                                    <span className="text-xs font-medium text-purple-700">R csapat</span>
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
                                    <span className="text-xs font-medium text-gray-500">Összesen ({stat.daysInMonth} nap)</span>
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

                                {/* Explainer / Legend per month was requested "a szinekhez az osszesen alatt mindengyik honapnal" */}
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

            {/* Global legend still useful? Maybe keep it simple or remove if per-card is enough. 
         User asked for "mindengyik honapnal", so per-card is key. 
         But having a global one at bottom is standard practice too. I'll keep it but simplify.
     */}
        </div>
    )
}

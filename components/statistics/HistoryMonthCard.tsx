import type { HistoryMonthlyStat } from "@/lib/statistics-domain"

interface HistoryMonthCardProps {
    stat: HistoryMonthlyStat
}

export function HistoryMonthCard({ stat }: HistoryMonthCardProps) {
    return (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
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
    )
}

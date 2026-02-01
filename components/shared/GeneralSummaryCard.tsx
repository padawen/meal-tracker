import { PeriodStats } from "@/lib/stats-utils"

interface GeneralSummaryCardProps {
    stats: PeriodStats
    period: "weekly" | "monthly" | "yearly"
}

export function GeneralSummaryCard({ stats, period }: GeneralSummaryCardProps) {
    return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4">
            <div className="text-center mb-1">
                <p className="text-sm font-semibold text-[#1F2937]">
                    {stats.elapsedDays}/{stats.totalDays} nap telt el
                </p>
            </div>
            <div className="flex items-center justify-center gap-2 flex-nowrap overflow-x-auto">
                {/* Always show kaja */}
                <div className="flex items-center gap-1 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-semibold text-[#1F2937]">{stats.hadMeal}</span>
                    <span className="text-xs text-[#6B7280]">kaja</span>
                </div>

                <div className="h-4 w-px bg-gray-200 shrink-0"></div>

                {/* Always show nincs */}
                <div className="flex items-center gap-1 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <span className="text-sm font-semibold text-[#1F2937]">{stats.noMeal}</span>
                    <span className="text-xs text-[#6B7280]">nincs</span>
                </div>

                {/* Only show üres if > 0 */}
                {stats.unfilled > 0 && (
                    <>
                        <div className="h-4 w-px bg-gray-200 shrink-0"></div>
                        <div className="flex items-center gap-1 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                            <span className="text-sm font-semibold text-[#1F2937]">{stats.unfilled}</span>
                            <span className="text-xs text-[#6B7280]">üres</span>
                        </div>
                    </>
                )}

                {/* Only show szünnap if > 0 */}
                {stats.holidays > 0 && (
                    <>
                        <div className="h-4 w-px bg-gray-200 shrink-0"></div>
                        <div className="flex items-center gap-1 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                            <span className="text-sm font-semibold text-[#1F2937]">{stats.holidays}</span>
                            <span className="text-xs text-[#6B7280]">szünnap</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

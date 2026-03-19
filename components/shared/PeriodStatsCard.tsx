import { ReactNode } from "react"
import { PeriodStats } from "@/lib/stats-utils"

interface PeriodStatsCardProps {
    title: string
    stats: PeriodStats
    icon: ReactNode
    iconBgColor: string
}

export function PeriodStatsCard({ title, stats, icon, iconBgColor }: PeriodStatsCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-[#6B7280] font-medium">{title}</p>
                    <p className="text-lg font-bold text-[#1F2937]">
                        {stats.elapsedDays}/{stats.totalDays} nap telt el
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100 no-wrap overflow-x-auto">
                <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-lg font-bold text-[#1F2937]">{stats.hadMeal}</span>
                    </div>
                    <span className="text-xs font-medium text-[#6B7280]">kaja</span>
                </div>

                <div className="h-8 w-px bg-gray-200 shrink-0"></div>

                <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span className="text-lg font-bold text-[#1F2937]">{stats.noMeal}</span>
                    </div>
                    <span className="text-xs font-medium text-[#6B7280]">nincs</span>
                </div>

                {stats.unfilled > 0 && (
                    <>
                        <div className="h-8 w-px bg-gray-200 shrink-0"></div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-lg font-bold text-[#1F2937]">{stats.unfilled}</span>
                            </div>
                            <span className="text-xs font-medium text-[#6B7280]">üres</span>
                        </div>
                    </>
                )}

                {stats.holidays > 0 && (
                    <>
                        <div className="h-8 w-px bg-gray-200 shrink-0"></div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-lg font-bold text-[#1F2937]">{stats.holidays}</span>
                            </div>
                            <span className="text-xs font-medium text-[#6B7280]">szünnap</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

import { PeriodStats } from "@/lib/stats-utils"

interface TeamSummaryCardProps {
    team: "A" | "B"
    teamName: string
    stats: PeriodStats
    period: "weekly" | "monthly" | "yearly"
}

export function TeamSummaryCard({ team, teamName, stats, period }: TeamSummaryCardProps) {
    const bgColor = team === "A" ? "from-blue-50 to-white" : "from-purple-50 to-white"
    const borderColor = team === "A" ? "border-blue-200" : "border-purple-200"
    const textColor = team === "A" ? "text-blue-700" : "text-purple-700"

    return (
        <div className={`bg-gradient-to-br ${bgColor} rounded-xl border ${borderColor} p-4`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-semibold ${textColor}`}>{teamName}</span>
                <span className="text-xs text-[#6B7280]">{stats.totalDays} nap</span>
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
                {/* Always show kaja */}
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-semibold text-[#1F2937]">{stats.hadMeal}</span>
                    <span className="text-xs text-[#6B7280]">kaja</span>
                </div>

                <div className="h-4 w-px bg-gray-200"></div>

                {/* Always show nincs */}
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <span className="text-sm font-semibold text-[#1F2937]">{stats.noMeal}</span>
                    <span className="text-xs text-[#6B7280]">nincs</span>
                </div>
            </div>
        </div>
    )
}

interface TeamSummaryCardProps {
    team: "A" | "B"
    teamName: string
    hadMeal: number
    noMeal: number
    totalDays: number
    period: "weekly" | "monthly" | "yearly"
}

export function TeamSummaryCard({ team, teamName, hadMeal, noMeal, totalDays, period }: TeamSummaryCardProps) {
    const periodLabel = period === "weekly" ? "Heti összesítés" : period === "monthly" ? "Havi összesítés" : "Éves összesítés"
    const workedLabel = period === "weekly" ? "dolgozott a héten" : period === "monthly" ? "dolgozott a hónapban" : "dolgozott az évben"

    return (
        <div className="border border-[#E5E7EB] rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-2 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 shadow-sm ${team === "A" ? "bg-blue-100" : "bg-purple-100"
                    }`}>
                    <span className={`font-bold text-lg ${team === "A" ? "text-blue-600" : "text-purple-600"
                        }`}>{team}</span>
                </div>
                <div>
                    <p className="font-bold text-lg text-[#1F2937]">{team} csapat</p>
                    <p className="text-sm text-[#6B7280]">{teamName}</p>
                </div>
            </div>

            <div className="w-full pt-4 border-t border-gray-100 mt-2">
                <p className="text-sm text-[#6B7280] mb-3">{periodLabel}</p>
                <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                            <span className="text-2xl font-bold text-[#1F2937]">{hadMeal}</span>
                        </div>
                        <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">kaja</span>
                    </div>
                    <div className="h-10 w-px bg-gray-100"></div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                            <span className="text-2xl font-bold text-[#1F2937]">{noMeal}</span>
                        </div>
                        <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">nincs</span>
                    </div>
                </div>
                <div className="mt-6 text-sm font-medium text-[#9CA3AF] italic">
                    {totalDays}x {workedLabel}
                </div>
            </div>
        </div>
    )
}

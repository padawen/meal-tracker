interface GeneralSummaryCardProps {
    hadMeal: number
    noMeal: number
    totalDays: number
    period: "weekly" | "monthly" | "yearly"
}

export function GeneralSummaryCard({ hadMeal, noMeal, totalDays, period }: GeneralSummaryCardProps) {
    const periodLabel = period === "weekly" ? "Heti összesítés" : period === "monthly" ? "Havi összesítés" : "Éves összesítés"
    const workedLabel = period === "weekly" ? "nap a héten" : period === "monthly" ? "nap a hónapban" : "nap az évben"

    return (
        <div className="border border-[#E5E7EB] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                    <span className="font-bold text-gray-600">Σ</span>
                </div>
                <div>
                    <p className="font-semibold text-[#1F2937]">Összesített</p>
                    <p className="text-xs text-[#6B7280]">Mindenki</p>
                </div>
            </div>

            <div>
                <p className="text-xs text-[#6B7280] mb-1">{periodLabel}</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                        <span className="text-sm font-medium text-[#1F2937]">{hadMeal}</span>
                        <span className="text-xs text-[#6B7280]">kaja</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                        <span className="text-sm font-medium text-[#1F2937]">{noMeal}</span>
                        <span className="text-xs text-[#6B7280]">nincs</span>
                    </div>
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">
                    ({totalDays} {workedLabel})
                </div>
            </div>
        </div>
    )
}

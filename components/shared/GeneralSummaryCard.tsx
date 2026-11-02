import type { PeriodStats } from "@/lib/stats-utils"

interface GeneralSummaryCardProps {
    stats: PeriodStats
    period: "weekly" | "monthly" | "yearly"
}

export function GeneralSummaryCard({ stats }: GeneralSummaryCardProps) {
    const metrics = [
        { label: "kaja", count: stats.hadMeal, color: "bg-emerald-500", visible: true },
        { label: "nincs", count: stats.noMeal, color: "bg-rose-500", visible: true },
        { label: "üres", count: stats.unfilled, color: "bg-amber-500", visible: stats.unfilled > 0 },
        { label: "szünnap", count: stats.holidays, color: "bg-purple-500", visible: stats.holidays > 0 },
    ].filter((metric) => metric.visible)

    return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4">
            <div className="text-center mb-1">
                <p className="text-sm font-semibold text-[#1F2937]">
                    {stats.elapsedDays}/{stats.totalDays} nap telt el
                </p>
            </div>
            <div className="grid auto-cols-fr grid-flow-col gap-1 divide-x divide-gray-200 text-center">
                {metrics.map((metric) => (
                    <div key={metric.label} className="flex min-w-0 flex-col items-center">
                        <div className="flex items-center gap-1">
                            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${metric.color}`} />
                            <span className="text-sm font-semibold text-[#1F2937] tabular-nums">{metric.count}</span>
                        </div>
                        <span className="text-xs text-[#6B7280]">{metric.label}</span>
                    </div>
                ))}
            </div>
            {/* Reclaim the second metric line from the footer spacing, keeping the card height unchanged. */}
            <div className="mt-1 flex items-center justify-center gap-1 border-t border-gray-200 pt-1 text-sm font-semibold text-amber-700">
                <span>{stats.ratingAverage !== null ? stats.ratingAverage.toFixed(1).replace('.', ',') : 'Nincs értékelés'}</span>
                {stats.ratingCount > 0 && <span className="text-xs font-normal text-[#6B7280]">({stats.ratingCount})</span>}
            </div>
        </div>
    )
}

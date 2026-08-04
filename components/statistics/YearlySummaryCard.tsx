import { TeamSummaryCard } from "@/components/shared"
import { PeriodStats } from "@/lib/stats-utils"

interface StatsSummaryCardProps {
    title: string | number
    teamAHad: number
    teamANo: number
    teamBHad: number
    teamBNo: number
    totalHad: number
    totalNo: number
    holidays?: number
    ratingSum?: number
    ratingCount?: number
    teamARatingSum?: number
    teamARatingCount?: number
    teamBRatingSum?: number
    teamBRatingCount?: number
}

function makeTeamStats(had: number, no: number, ratingSum = 0, ratingCount = 0): PeriodStats {
    return {
        hadMeal: had,
        noMeal: no,
        unfilled: 0,
        holidays: 0,
        totalDays: had + no,
        elapsedDays: had + no,
        ratingSum,
        ratingCount,
        ratingAverage: ratingCount > 0 ? ratingSum / ratingCount : null,
    }
}

export function StatsSummaryCard({
    title, teamAHad, teamANo, teamBHad, teamBNo, totalHad, totalNo, holidays = 0,
    ratingSum = 0, ratingCount = 0, teamARatingSum = 0, teamARatingCount = 0, teamBRatingSum = 0, teamBRatingCount = 0
}: StatsSummaryCardProps) {
    return (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-900">{title}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{totalHad + totalNo} rögzítés</span>
                    {holidays > 0 && (
                        <span className="flex items-center gap-1 text-xs text-purple-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
                            {holidays} szünnap
                        </span>
                    )}
                </div>
            </div>
            <div className="space-y-2">
                <TeamSummaryCard team="A" teamName="Zs csapat" stats={makeTeamStats(teamAHad, teamANo, teamARatingSum, teamARatingCount)} period="yearly" />
                <TeamSummaryCard team="B" teamName="R csapat" stats={makeTeamStats(teamBHad, teamBNo, teamBRatingSum, teamBRatingCount)} period="yearly" />
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 flex-wrap gap-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Összesen</span>
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>{totalHad}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-bold text-rose-700">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>{totalNo}
                        </span>
                    </div>
                </div>
                <div className="pt-2 border-t border-dashed border-gray-200 text-center text-xs text-amber-700">
                    {ratingCount > 0 ? `${(ratingSum / ratingCount).toFixed(1).replace('.', ',')} · ${ratingCount} értékelés` : 'Nincs értékelés'}
                </div>
            </div>
        </div>
    )
}

export const YearlySummaryCard = StatsSummaryCard

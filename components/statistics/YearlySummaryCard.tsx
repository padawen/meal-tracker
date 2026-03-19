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
}

function makeTeamStats(had: number, no: number): PeriodStats {
    return {
        hadMeal: had,
        noMeal: no,
        unfilled: 0,
        holidays: 0,
        totalDays: had + no,
        elapsedDays: had + no,
    }
}

export function StatsSummaryCard({
    title, teamAHad, teamANo, teamBHad, teamBNo, totalHad, totalNo, holidays = 0
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
                <TeamSummaryCard team="A" teamName="Zs csapat" stats={makeTeamStats(teamAHad, teamANo)} period="yearly" />
                <TeamSummaryCard team="B" teamName="R csapat" stats={makeTeamStats(teamBHad, teamBNo)} period="yearly" />
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
            </div>
        </div>
    )
}

export const YearlySummaryCard = StatsSummaryCard

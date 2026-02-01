import { Users } from "lucide-react"
import { TeamSummaryCard } from "@/components/shared"
import { PeriodStats } from "@/lib/stats-utils"

interface TeamsTabProps {
    teamAWeekStats: PeriodStats
    teamBWeekStats: PeriodStats
    teamAMonthStats: PeriodStats
    teamBMonthStats: PeriodStats
    teamAYearStats: PeriodStats
    teamBYearStats: PeriodStats
}

export function TeamsTab({
    teamAWeekStats, teamBWeekStats,
    teamAMonthStats, teamBMonthStats,
    teamAYearStats, teamBYearStats
}: TeamsTabProps) {
    return (
        <>
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Heti összesítő
                </h2>
                <div className="space-y-4">
                    <TeamSummaryCard team="A" teamName="Zs csapat" stats={teamAWeekStats} period="weekly" />
                    <TeamSummaryCard team="B" teamName="R csapat" stats={teamBWeekStats} period="weekly" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Havi összesítő
                </h2>
                <div className="space-y-4">
                    <TeamSummaryCard team="A" teamName="Zs csapat" stats={teamAMonthStats} period="monthly" />
                    <TeamSummaryCard team="B" teamName="R csapat" stats={teamBMonthStats} period="monthly" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Éves összesítő
                </h2>
                <div className="space-y-4">
                    <TeamSummaryCard team="A" teamName="Zs csapat" stats={teamAYearStats} period="yearly" />
                    <TeamSummaryCard team="B" teamName="R csapat" stats={teamBYearStats} period="yearly" />
                </div>
            </div>
        </>
    )
}

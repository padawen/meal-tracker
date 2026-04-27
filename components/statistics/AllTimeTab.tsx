"use client"

import { useMemo } from "react"
import { UserLeaderboard, UserStat } from "./UserLeaderboard"
import { StatsSummaryCard } from "./YearlySummaryCard"
import type { HolidayRow, MealRecordRow, ProfileSummary } from "@/lib/meal-domain"
import { buildUserStatsFromRecords, summarizeRecordsByTeam } from "@/lib/statistics-domain"

interface AllTimeTabProps {
    rawRecords: MealRecordRow[]
    holidays: HolidayRow[]
    allUsers: Map<string, ProfileSummary>
}

export function AllTimeTab({ rawRecords, holidays, allUsers }: AllTimeTabProps) {
    const allTimeUserStats: UserStat[] = useMemo(() => {
        return buildUserStatsFromRecords(rawRecords, allUsers)
    }, [rawRecords, allUsers])

    const allTimeSummary = useMemo(() => summarizeRecordsByTeam(rawRecords), [rawRecords])

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#1F2937] mb-4">Minden idők összesítője</h3>
                <StatsSummaryCard
                    title="Összesített"
                    teamAHad={allTimeSummary.teamA.had}
                    teamANo={allTimeSummary.teamA.no}
                    teamBHad={allTimeSummary.teamB.had}
                    teamBNo={allTimeSummary.teamB.no}
                    totalHad={allTimeSummary.totalHad}
                    totalNo={allTimeSummary.totalNo}
                    holidays={holidays.length}
                />
            </div>

            <UserLeaderboard userStats={allTimeUserStats} title="Minden idők legjobb kitöltői" showTopBadge={false} />
        </div>
    )
}

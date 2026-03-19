"use client"

import { useMemo } from "react"
import { UserLeaderboard, UserStat } from "./UserLeaderboard"
import { StatsSummaryCard } from "./YearlySummaryCard"

interface AllTimeTabProps {
    rawRecords: Array<{ date: string; had_meal: boolean; team: string | null; recorded_by: string }>
    holidays: Array<{ date: string; name: string }>
    allUsers: Map<string, { full_name: string | null; email: string; avatar_url?: string | null }>
}

export function AllTimeTab({ rawRecords, holidays, allUsers }: AllTimeTabProps) {
    const allTimeUserStats: UserStat[] = useMemo(() => {
        const counts = new Map<string, number>()
        rawRecords.forEach(r => {
            counts.set(r.recorded_by, (counts.get(r.recorded_by) || 0) + 1)
        })
        return Array.from(counts.entries()).map(([uid, count]) => {
            const profile = allUsers.get(uid)
            return {
                userId: uid,
                fullName: profile?.full_name || profile?.email?.split('@')[0] || 'Névtelen',
                avatarUrl: profile?.avatar_url,
                recordCount: count,
            }
        }).sort((a, b) => b.recordCount - a.recordCount)
    }, [rawRecords, allUsers])

    const allTimeTeamA = useMemo(() => ({
        had: rawRecords.filter(r => r.team === 'A' && r.had_meal).length,
        no: rawRecords.filter(r => r.team === 'A' && !r.had_meal).length,
    }), [rawRecords])

    const allTimeTeamB = useMemo(() => ({
        had: rawRecords.filter(r => r.team === 'B' && r.had_meal).length,
        no: rawRecords.filter(r => r.team === 'B' && !r.had_meal).length,
    }), [rawRecords])

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#1F2937] mb-4">Minden idők összesítője</h3>
                <StatsSummaryCard
                    title="Összesített"
                    teamAHad={allTimeTeamA.had}
                    teamANo={allTimeTeamA.no}
                    teamBHad={allTimeTeamB.had}
                    teamBNo={allTimeTeamB.no}
                    totalHad={rawRecords.filter(r => r.had_meal).length}
                    totalNo={rawRecords.filter(r => !r.had_meal).length}
                    holidays={holidays.length}
                />
            </div>

            <UserLeaderboard userStats={allTimeUserStats} title="Minden idők legjobb kitöltői" />
        </div>
    )
}

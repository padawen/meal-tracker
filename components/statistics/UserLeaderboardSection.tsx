"use client"

import { UserLeaderboard } from "@/components/statistics/UserLeaderboard"
import { UserCompletionRatio } from "@/components/statistics/UserCompletionRatio"
import type { UserStat } from "@/components/statistics/UserLeaderboard"

interface UserLeaderboardSectionProps {
    userStats: UserStat[]
    elapsedDays: number
    totalDays: number
    elapsedHolidays: number
    totalHolidays: number
    isCurrentYear: boolean
    showYear?: boolean
}

export function UserLeaderboardSection({
    userStats,
    elapsedDays,
    totalDays,
    elapsedHolidays,
    totalHolidays,
    isCurrentYear,
    showYear = false,
}: UserLeaderboardSectionProps) {
    if (userStats.length === 0) return null
    return (
        <>
            <UserLeaderboard userStats={userStats} title="Legjobb kitöltők" />
            <UserCompletionRatio
                userStats={userStats}
                elapsedDays={elapsedDays}
                totalDays={totalDays}
                elapsedHolidays={elapsedHolidays}
                totalHolidays={totalHolidays}
                isCurrentYear={isCurrentYear}
            />
        </>
    )
}

import { UserLeaderboard, UserStat } from "./UserLeaderboard"
import { UserCompletionRatio } from "./UserCompletionRatio"

interface UsersTabProps {
    userStats: UserStat[]
    elapsedDays: number
    totalDays: number
    elapsedHolidays: number
    totalHolidays: number
}

export function UsersTab({ userStats, elapsedDays, totalDays, elapsedHolidays, totalHolidays }: UsersTabProps) {
    return (
        <div className="space-y-4">
            <UserLeaderboard userStats={userStats} title={`Legjobb kitöltők`} />

            <UserCompletionRatio
                userStats={userStats}
                elapsedDays={elapsedDays}
                totalDays={totalDays}
                elapsedHolidays={elapsedHolidays}
                totalHolidays={totalHolidays}
                isCurrentYear={true}
            />
        </div>
    )
}

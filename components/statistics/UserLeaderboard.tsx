import { UserLeaderboardRow } from "@/components/shared"
import type { UserStat } from "@/lib/statistics-domain"

export type { UserStat } from "@/lib/statistics-domain"

interface UserLeaderboardProps {
    userStats: UserStat[]
    title: string
    showTopBadge?: boolean
}

export function UserLeaderboard({ userStats, title, showTopBadge = true }: UserLeaderboardProps) {
    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4">{title}</h2>

            <div className="space-y-2">
                {userStats.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">Még nincsenek adatok.</p>
                ) : (
                    userStats.map((stat, index) => (
                        <UserLeaderboardRow
                            key={stat.userId}
                            rank={index + 1}
                            fullName={stat.fullName}
                            avatarUrl={stat.avatarUrl}
                            recordCount={stat.recordCount}
                            highlight={index === 0}
                            badgeText={index === 0 && showTopBadge ? "Kávépénz nyertese" : undefined}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

import { UserAvatar } from "@/components/shared"

export interface UserStat {
    userId: string
    fullName: string
    avatarUrl?: string | null
    recordCount: number
}

export function MedalIcon({ rank }: { rank: number }) {
    if (rank > 3) {
        return <span className="text-sm font-semibold text-gray-400 w-6 text-center">#{rank}</span>
    }
    const styles = rank === 1
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : rank === 2
            ? "bg-gray-100 text-gray-600 border-gray-300"
            : "bg-orange-100 text-orange-700 border-orange-300"

    const label = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"

    return (
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-base font-bold select-none ${styles}`}>
            {label}
        </div>
    )
}

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
                        <div
                            key={stat.userId}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${index === 0
                                ? "bg-amber-50 border-amber-200"
                                : "bg-gray-50/60 border-gray-100"
                                }`}
                        >
                            <div className="flex-shrink-0 flex items-center justify-center w-8">
                                <MedalIcon rank={index + 1} />
                            </div>

                            <UserAvatar avatarUrl={stat.avatarUrl} name={stat.fullName} size="sm" />

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1F2937] truncate">{stat.fullName}</p>
                                <p className="text-xs text-gray-400">{stat.recordCount} rögzített nap</p>
                            </div>

                            {index === 0 && showTopBadge && (
                                <div className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                                    Kávépénz nyertese
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

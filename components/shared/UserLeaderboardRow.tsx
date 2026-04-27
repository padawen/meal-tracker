import { UserAvatar } from "./UserAvatar"

export interface UserLeaderboardRowProps {
    rank: number
    fullName: string
    avatarUrl?: string | null
    recordCount: number
    highlight?: boolean
    badgeText?: string
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

export function UserLeaderboardRow({
    rank,
    fullName,
    avatarUrl,
    recordCount,
    highlight = false,
    badgeText,
}: UserLeaderboardRowProps) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${highlight
                ? "bg-amber-50 border-amber-200"
                : "bg-gray-50/60 border-gray-100"
                }`}
        >
            <div className="flex-shrink-0 flex items-center justify-center w-8">
                <MedalIcon rank={rank} />
            </div>

            <UserAvatar avatarUrl={avatarUrl} name={fullName} size="sm" />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1F2937] truncate">{fullName}</p>
                <p className="text-xs text-gray-400">{recordCount} rögzített nap</p>
            </div>

            {badgeText && (
                <div className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    {badgeText}
                </div>
            )}
        </div>
    )
}

function getAvatarColor(name: string): { bg: string; text: string } {
    const colors = [
        { bg: "bg-indigo-100", text: "text-indigo-700" },
        { bg: "bg-emerald-100", text: "text-emerald-700" },
        { bg: "bg-rose-100", text: "text-rose-700" },
        { bg: "bg-amber-100", text: "text-amber-700" },
        { bg: "bg-violet-100", text: "text-violet-700" },
        { bg: "bg-sky-100", text: "text-sky-700" },
        { bg: "bg-pink-100", text: "text-pink-700" },
        { bg: "bg-teal-100", text: "text-teal-700" },
        { bg: "bg-orange-100", text: "text-orange-700" },
        { bg: "bg-cyan-100", text: "text-cyan-700" },
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % colors.length
    }
    return colors[Math.abs(hash)]
}

interface UserAvatarProps {
    avatarUrl?: string | null
    name: string
    size?: "sm" | "md" | "lg"
}

const sizeMap = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
}

export function UserAvatar({ avatarUrl, name, size = "md" }: UserAvatarProps) {
    const sizeClass = sizeMap[size]
    const initial = (name || "?").charAt(0).toUpperCase()
    const { bg, text } = getAvatarColor(name || "?")

    return (
        <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold`}>
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className={`w-full h-full flex items-center justify-center ${bg} ${text}`}>
                    {initial}
                </div>
            )}
        </div>
    )
}

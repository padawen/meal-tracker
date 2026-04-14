import { CheckCircle2, XCircle, AlertCircle, Check, X, Minus } from "lucide-react"

export type FoodStatus = "volt" | "nem" | "empty"

export interface DayData {
    date: Date
    status: FoodStatus
    food?: string
    reason?: string
    recordedBy?: string
    recordedByUserId?: string
    recordedAt?: string
    team?: "A" | "B"
    isHoliday?: boolean
    holidayName?: string
}

interface DayItemProps {
    day: DayData
    onClick: () => void
}

const getStatusStyles = (status: FoodStatus) => {
    switch (status) {
        case "volt":
            return "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
        case "nem":
            return "bg-rose-50 border-rose-200 hover:border-rose-300"
        default:
            return "bg-amber-50 border-amber-200 hover:border-amber-300"
    }
}

const getStatusIcon = (status: FoodStatus) => {
    switch (status) {
        case "volt":
            return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        case "nem":
            return <XCircle className="w-5 h-5 text-rose-500" />
        default:
            return <AlertCircle className="w-5 h-5 text-amber-500" />
    }
}

const formatDate = (date: Date) => {
    const dayNames = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat']
    const dayName = dayNames[date.getDay()]
    const dateStr = date.toLocaleDateString("hu-HU", { month: "long", day: "numeric" })
    return `${dateStr} (${dayName})`
}

const isToday = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return d.getTime() === t.getTime()
}

const isFutureDate = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return d.getTime() > t.getTime()
}

export function DayItem({ day, onClick }: DayItemProps) {
    const isDisabled = isFutureDate(day.date) || day.isHoliday

    const getStatusBg = (status: FoodStatus) => {
        if (status === "volt") return "bg-emerald-50"
        if (status === "nem") return "bg-rose-50"
        return "bg-amber-50/50"
    }

    const getTeamBorder = (team?: string) => {
        if (team === "A") return "border-blue-400"
        if (team === "B") return "border-pink-400"
        return "border-[#E5E7EB]"
    }

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col gap-3 cursor-pointer relative overflow-hidden ${day.isHoliday
                ? 'opacity-75 cursor-not-allowed bg-purple-50 border-purple-300'
                : isFutureDate(day.date)
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                    : `${getStatusBg(day.status)} ${getTeamBorder(day.team)}`
                } ${isToday(day.date) ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1F2937]">
                        {formatDate(day.date)}
                    </p>
                    {isToday(day.date) && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Ma</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {day.team && (
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm ${day.team === "A"
                            ? "bg-blue-600 text-white"
                            : "bg-pink-600 text-white"
                            }`}>
                            {day.team === "A" ? "Zs csapat" : "R csapat"}
                        </div>
                    )}
                    <div className="shrink-0 scale-75">
                        {day.isHoliday ? (
                            <AlertCircle className="w-5 h-5 text-purple-500" />
                        ) : (
                            getStatusIcon(day.status)
                        )}
                    </div>
                </div>
            </div>

            {!day.isHoliday && day.status !== "empty" ? (
                <div className="w-full">
                    {day.status === "volt" && day.food && (
                        <h3 className="text-base font-bold text-gray-900 leading-tight">
                            {day.food}
                        </h3>
                    )}
                    {day.status === "nem" && (
                        day.reason ? (
                            <p className="text-sm font-medium text-rose-700 bg-rose-100/50 px-3 py-1.5 rounded-xl inline-block">
                                {day.reason}
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-red-500 py-1.5 inline-block">
                                Nincs indoklás
                            </p>
                        )
                    )}
                </div>
            ) : day.isHoliday ? (
                <p className="text-sm font-medium text-purple-700 italic">
                    {day.holidayName}
                </p>
            ) : !isDisabled && (
                <p className="text-sm text-amber-500 font-medium italic">
                    Nincs még rögzítve
                </p>
            )}

            {day.recordedBy && !day.isHoliday && (
                <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 pt-1 border-t border-black/5 w-full">
                    <span className="truncate max-w-[150px]">{day.recordedBy}</span>
                    <span className="opacity-30">•</span>
                    <span>{day.recordedAt}</span>
                </div>
            )}
        </button>
    )
}

import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export type FoodStatus = "volt" | "nem" | "empty"

export interface DayData {
    date: Date
    status: FoodStatus
    food?: string
    reason?: string
    recordedBy?: string
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

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 cursor-pointer ${day.isHoliday
                ? 'opacity-75 cursor-not-allowed bg-purple-50 border-purple-300'
                : isFutureDate(day.date)
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                    : getStatusStyles(day.status)
                } ${isToday(day.date) ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
        >
            {getStatusIcon(day.status)}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1F2937]">{formatDate(day.date)}</p>
                    {isToday(day.date) && (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Ma</span>
                    )}
                </div>
                {day.isHoliday && (
                    <p className="text-xs text-purple-600 font-medium">
                        {day.holidayName}
                    </p>
                )}
                {day.recordedBy && !day.isHoliday && (
                    <p className="text-xs text-[#6B7280]">
                        {day.recordedBy} · {day.recordedAt}
                    </p>
                )}
            </div>

            <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${day.isHoliday
                    ? "bg-purple-100 text-purple-700"
                    : day.status === "volt"
                        ? "bg-emerald-100 text-emerald-700"
                        : day.status === "nem"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                    }`}
            >
                {day.isHoliday ? "Szünnap" : day.status === "volt" ? "Volt" : day.status === "nem" ? "Nem volt" : "Kitöltetlen"}
            </span>
        </button>
    )
}

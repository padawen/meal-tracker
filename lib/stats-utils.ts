
export interface DayData {
    date: Date
    status: "volt" | "nem" | "empty"
    isHoliday?: boolean
    holidayName?: string
    ratingSum?: number
    ratingCount?: number
    ratingAverage?: number | null
}

export interface PeriodStats {
    hadMeal: number
    noMeal: number
    unfilled: number
    holidays: number
    totalDays: number
    elapsedDays: number
    ratingSum: number
    ratingCount: number
    ratingAverage: number | null
}

export function calculatePeriodStats(days: DayData[], today: Date): PeriodStats {
    const todayZero = new Date(today)
    todayZero.setHours(0, 0, 0, 0)

    let hadMeal = 0
    let noMeal = 0
    let unfilled = 0
    let holidays = 0
    let elapsedDays = 0
    let ratingSum = 0
    let ratingCount = 0

    days.forEach(day => {
        const dayZero = new Date(day.date)
        dayZero.setHours(0, 0, 0, 0)

        if (dayZero <= todayZero) {
            elapsedDays++
        }

        if (day.isHoliday) {
            holidays++
        } else if (day.status === "volt") {
            hadMeal++
        } else if (day.status === "nem") {
            noMeal++
        } else if (day.status === "empty" && dayZero <= todayZero) {
            unfilled++
        }

        if (day.status === "volt") {
            ratingSum += day.ratingSum || 0
            ratingCount += day.ratingCount || 0
        }
    })

    return {
        hadMeal,
        noMeal,
        unfilled,
        holidays,
        totalDays: days.length,
        elapsedDays,
        ratingSum,
        ratingCount,
        ratingAverage: ratingCount > 0 ? ratingSum / ratingCount : null,
    }
}

"use client"

import { useState } from "react"
import { LoadingState } from "@/components/meal-table/LoadingState"
import { TabNavigation } from "@/components/shared"
import { HistoryTab } from "./HistoryTab"
import { GeneralTab } from "./GeneralTab"
import { TeamsTab } from "./TeamsTab"
import { UsersTab } from "./UsersTab"
import { AllTimeTab } from "./AllTimeTab"
import { useStatsData } from "./useStatsData"

type TabKey = "general" | "teams" | "users" | "history" | "alltime"

const TOP_TABS = [
    { key: "general" as const, label: "Általános" },
    { key: "teams" as const, label: "Csapatok" },
    { key: "users" as const, label: "Felhasználók" },
]

const BOTTOM_TABS = [
    { key: "history" as const, label: "Előzmények" },
    { key: "alltime" as const, label: "Minden idők" },
]

export function Statistics() {
    const [activeTab, setActiveTab] = useState<TabKey>("general")
    const [historyYear, setHistoryYear] = useState<string>(new Date().getFullYear().toString())

    const {
        status, retry,
        weekStats, monthStats, yearStats,
        teamAWeekStats, teamBWeekStats,
        teamAMonthStats, teamBMonthStats,
        teamAYearStats, teamBYearStats,
        historyYears, rawRecords, holidays, allUsers, userStats,
        elapsedDaysOfYear, totalDaysOfYear,
        elapsedHolidaysOfYear, totalHolidaysOfYear
    } = useStatsData(activeTab, historyYear)

    return (
        <div className="space-y-4">
            <div className="flex justify-center">
                <div className="bg-[#F3F4F6] rounded-xl p-1 inline-flex flex-col gap-0.5">
                    <div className="flex">
                        {TOP_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${activeTab === tab.key
                                    ? "bg-white text-[#1F2937] shadow-sm"
                                    : "text-[#6B7280] hover:text-[#1F2937]"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-center">
                        {BOTTOM_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${activeTab === tab.key
                                    ? "bg-white text-[#1F2937] shadow-sm"
                                    : "text-[#6B7280] hover:text-[#1F2937]"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <LoadingState status={status} retry={retry} className="min-h-[400px]">
            {activeTab === "history" ? (
                <HistoryTab
                    historyYear={historyYear}
                    setHistoryYear={setHistoryYear}
                    historyYears={historyYears}
                    rawRecords={rawRecords}
                    holidays={holidays}
                    allUsers={allUsers}
                />
            ) : activeTab === "general" ? (
                <GeneralTab weekStats={weekStats} monthStats={monthStats} yearStats={yearStats} />
            ) : activeTab === "teams" ? (
                <TeamsTab
                    teamAWeekStats={teamAWeekStats}
                    teamBWeekStats={teamBWeekStats}
                    teamAMonthStats={teamAMonthStats}
                    teamBMonthStats={teamBMonthStats}
                    teamAYearStats={teamAYearStats}
                    teamBYearStats={teamBYearStats}
                />
            ) : activeTab === "alltime" ? (
                <AllTimeTab
                    rawRecords={rawRecords}
                    holidays={holidays}
                    allUsers={allUsers}
                />
            ) : (
                <UsersTab
                    userStats={userStats}
                    elapsedDays={elapsedDaysOfYear}
                    totalDays={totalDaysOfYear}
                    elapsedHolidays={elapsedHolidaysOfYear}
                    totalHolidays={totalHolidaysOfYear}
                />
            )}
            </LoadingState>
        </div>
    )
}

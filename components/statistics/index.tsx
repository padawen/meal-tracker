"use client"

import { useState } from "react"
import { BarChart3, Loader2, Users, History } from "lucide-react"
import { Header } from "@/components/shared"
import { HistoryTab } from "./HistoryTab"
import { GeneralTab } from "./GeneralTab"
import { TeamsTab } from "./TeamsTab"
import { useStatsData } from "./useStatsData"

export function Statistics() {
    const [activeTab, setActiveTab] = useState<"general" | "teams" | "history">("general")
    const [historyYear, setHistoryYear] = useState<string>(new Date().getFullYear().toString())

    const {
        loading,
        weekStats, monthStats, yearStats,
        teamAWeekStats, teamBWeekStats,
        teamAMonthStats, teamBMonthStats,
        teamAYearStats, teamBYearStats,
        historyYears, rawRecords, holidays
    } = useStatsData()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Header
                title="Statisztikák"
                description="Étkezési adatok áttekintése"
                icon={<BarChart3 className="w-6 h-6 text-indigo-600" />}
            />

            {/* Tab Navigation */}
            <div className="flex justify-center overflow-x-auto pb-1">
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-1 shadow-sm flex gap-1 w-auto min-w-max">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === "general" ? "bg-indigo-600 text-white shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>Általános</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("teams")}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === "teams" ? "bg-indigo-600 text-white shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"}`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Csapatok</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === "history" ? "bg-indigo-600 text-white shadow-sm" : "text-[#6B7280] hover:text-[#1F2937]"}`}
                    >
                        <History className="w-4 h-4" />
                        Előzmények
                    </button>
                </div>
            </div>

            {activeTab === "history" ? (
                <HistoryTab
                    historyYear={historyYear}
                    setHistoryYear={setHistoryYear}
                    historyYears={historyYears}
                    rawRecords={rawRecords}
                    holidays={holidays}
                />
            ) : activeTab === "general" ? (
                <GeneralTab weekStats={weekStats} monthStats={monthStats} yearStats={yearStats} />
            ) : (
                <TeamsTab
                    teamAWeekStats={teamAWeekStats}
                    teamBWeekStats={teamBWeekStats}
                    teamAMonthStats={teamAMonthStats}
                    teamBMonthStats={teamBMonthStats}
                    teamAYearStats={teamAYearStats}
                    teamBYearStats={teamBYearStats}
                />
            )}
        </div>
    )
}

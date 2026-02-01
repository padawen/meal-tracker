import { Users } from "lucide-react"
import { GeneralSummaryCard } from "@/components/shared"
import { PeriodStats } from "@/lib/stats-utils"

interface GeneralTabProps {
    weekStats: PeriodStats
    monthStats: PeriodStats
    yearStats: PeriodStats
}

export function GeneralTab({ weekStats, monthStats, yearStats }: GeneralTabProps) {
    return (
        <>
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Heti összesítő
                </h2>
                <div className="flex justify-center">
                    <div className="w-full max-w-md">
                        <GeneralSummaryCard stats={weekStats} period="weekly" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Havi összesítő
                </h2>
                <div className="flex justify-center">
                    <div className="w-full max-w-md">
                        <GeneralSummaryCard stats={monthStats} period="monthly" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Éves összesítő
                </h2>
                <div className="flex justify-center">
                    <div className="w-full max-w-md">
                        <GeneralSummaryCard stats={yearStats} period="yearly" />
                    </div>
                </div>
            </div>
        </>
    )
}

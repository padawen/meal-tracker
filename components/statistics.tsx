"use client"

import { useEffect, useState, useMemo } from "react"
import { BarChart3, Loader2, Users, History } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { TeamSummaryCard } from "@/components/team-summary-card"
import { GeneralSummaryCard } from "@/components/general-summary-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TeamStats {
  team: "A" | "B"
  weekly: { had_meal: number; no_meal: number; total_days: number }
  monthly: { had_meal: number; no_meal: number; total_days: number }
  yearly: { had_meal: number; no_meal: number; total_days: number }
}

interface GeneralStats {
  had_meal: number
  no_meal: number
  total_days: number
}

export function Statistics() {
  const [activeTab, setActiveTab] = useState<"general" | "teams" | "history">("general")
  const [loading, setLoading] = useState(true)
  const [allRecords, setAllRecords] = useState<Array<{ date: string; had_meal: boolean; team: string | null }>>([])

  // General stats
  const [generalWeekly, setGeneralWeekly] = useState<GeneralStats>({ had_meal: 0, no_meal: 0, total_days: 0 })
  const [generalMonthly, setGeneralMonthly] = useState<GeneralStats>({ had_meal: 0, no_meal: 0, total_days: 0 })
  const [generalYearly, setGeneralYearly] = useState<GeneralStats>({ had_meal: 0, no_meal: 0, total_days: 0 })

  // Team stats
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])

  // History stats logic
  const [historyYear, setHistoryYear] = useState<string>(new Date().getFullYear().toString())

  const historyYears = useMemo(() => {
    const uniqueYears = Array.from(new Set(allRecords.map(r => new Date(r.date).getFullYear()))).sort((a, b) => b - a)
    if (uniqueYears.length === 0 || !uniqueYears.includes(new Date().getFullYear())) {
      if (!uniqueYears.includes(new Date().getFullYear())) {
        uniqueYears.unshift(new Date().getFullYear())
      }
    }
    return uniqueYears.map(String)
  }, [allRecords])

  const historyMonthlyStats = useMemo(() => {
    const yearRecords = allRecords.filter(r => new Date(r.date).getFullYear().toString() === historyYear)

    const stats = []
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December']

    for (let i = 0; i < 12; i++) {
      const monthRecs = yearRecords.filter(r => new Date(r.date).getMonth() === i)

      if (monthRecs.length === 0 && historyYear !== new Date().getFullYear().toString()) continue;
      if (monthRecs.length === 0 && i > new Date().getMonth() && historyYear === new Date().getFullYear().toString()) continue;

      stats.push({
        name: monthNames[i],
        teamA: {
          had: monthRecs.filter(r => r.team === 'A' && r.had_meal).length,
          no: monthRecs.filter(r => r.team === 'A' && !r.had_meal).length
        },
        teamB: {
          had: monthRecs.filter(r => r.team === 'B' && r.had_meal).length,
          no: monthRecs.filter(r => r.team === 'B' && !r.had_meal).length
        },
        total: {
          had: monthRecs.filter(r => r.had_meal).length,
          no: monthRecs.filter(r => !r.had_meal).length
        }
      })
    }
    return stats
  }, [historyYear, allRecords])

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        // Fetch all records from 2026 onwards
        const { data: records, error } = await supabase
          .from('meal_records')
          .select('date, had_meal, team')
          // .gte('date', '2026-01-01') // Removed to allow history view
          .order('date', { ascending: true })
          .returns<Array<{ date: string; had_meal: boolean; team: string | null }>>()

        if (error) throw error

        if (!records || records.length === 0) {
          setLoading(false)
          return
        }

        setAllRecords(records)

        const today = new Date()
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() + diff)
        startOfWeek.setHours(0, 0, 0, 0)

        const currentMonth = today.getMonth()
        const currentYear = today.getFullYear()

        // === GENERAL STATS ===
        const weekEnd = new Date(startOfWeek)
        weekEnd.setDate(weekEnd.getDate() + 7)

        // Weekly general stats
        const weekRecords = records.filter(r => {
          const recordDate = new Date(r.date)
          return recordDate >= startOfWeek && recordDate < weekEnd
        })
        setGeneralWeekly({
          had_meal: weekRecords.filter(r => r.had_meal).length,
          no_meal: weekRecords.filter(r => !r.had_meal).length,
          total_days: weekRecords.length
        })

        // Monthly general stats
        const monthRecords = records.filter(r => {
          const recordDate = new Date(r.date)
          return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
        })
        setGeneralMonthly({
          had_meal: monthRecords.filter(r => r.had_meal).length,
          no_meal: monthRecords.filter(r => !r.had_meal).length,
          total_days: monthRecords.length
        })

        // Yearly general stats
        const yearRecords = records.filter(r => {
          const recordDate = new Date(r.date)
          return recordDate.getFullYear() === currentYear
        })
        setGeneralYearly({
          had_meal: yearRecords.filter(r => r.had_meal).length,
          no_meal: yearRecords.filter(r => !r.had_meal).length,
          total_days: yearRecords.length
        })

        // Calculate team summary stats

        const teams: TeamStats[] = [
          {
            team: "A",
            weekly: { had_meal: 0, no_meal: 0, total_days: 0 },
            monthly: { had_meal: 0, no_meal: 0, total_days: 0 },
            yearly: { had_meal: 0, no_meal: 0, total_days: 0 }
          },
          {
            team: "B",
            weekly: { had_meal: 0, no_meal: 0, total_days: 0 },
            monthly: { had_meal: 0, no_meal: 0, total_days: 0 },
            yearly: { had_meal: 0, no_meal: 0, total_days: 0 }
          }
        ]

        records.forEach(record => {
          const recordDate = new Date(record.date)
          const isThisWeek = recordDate >= startOfWeek && recordDate < weekEnd
          const isThisMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
          const isThisYear = recordDate.getFullYear() === currentYear

          if (record.team === "A" || record.team === "B") {
            const teamIndex = record.team === "A" ? 0 : 1

            if (isThisWeek) {
              teams[teamIndex].weekly.total_days++
              if (record.had_meal) {
                teams[teamIndex].weekly.had_meal++
              } else {
                teams[teamIndex].weekly.no_meal++
              }
            }

            if (isThisMonth) {
              teams[teamIndex].monthly.total_days++
              if (record.had_meal) {
                teams[teamIndex].monthly.had_meal++
              } else {
                teams[teamIndex].monthly.no_meal++
              }
            }

            if (isThisYear) {
              teams[teamIndex].yearly.total_days++
              if (record.had_meal) {
                teams[teamIndex].yearly.had_meal++
              } else {
                teams[teamIndex].yearly.no_meal++
              }
            }
          }
        })

        setTeamStats(teams)

      } catch (error) {
        console.error('Error fetching statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [])



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1F2937]">Statisztikák</h1>
            <p className="text-sm text-[#6B7280]">Étkezési adatok áttekintése</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-1 shadow-sm grid grid-cols-2 sm:inline-flex gap-1 sm:gap-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${activeTab === "general"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="truncate">Általános</span>
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${activeTab === "teams"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            <Users className="w-4 h-4" />
            <span className="truncate">Csapatok</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`col-span-2 sm:col-span-auto px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${activeTab === "history"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#1F2937]"
              }`}
          >
            <History className="w-4 h-4" />
            Előzmények
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "history" ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Előzmények visszatekintése
            </h2>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <span>Válassz évet:</span>
              <Select value={historyYear} onValueChange={setHistoryYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Év" />
                </SelectTrigger>
                <SelectContent>
                  {historyYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-center justify-center gap-4">
            <span className="font-medium">A csapat: <span className="font-normal text-blue-600">Zs csapat</span></span>
            <span className="text-blue-300">|</span>
            <span className="font-medium">B csapat: <span className="font-normal text-blue-600">Reni csapat</span></span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Hónap</th>
                  <th className="px-4 py-3 font-medium text-blue-600 text-center bg-blue-50/50">A csapat</th>
                  <th className="px-4 py-3 font-medium text-purple-600 text-center bg-purple-50/50">B csapat</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Összesen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historyMonthlyStats.length > 0 ? (
                  historyMonthlyStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{stat.name}</td>

                      {/* Team A */}
                      <td className="px-4 py-3 text-center bg-blue-50/30">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-emerald-600 font-medium">{stat.teamA.had}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-rose-600 font-medium">{stat.teamA.no}</span>
                        </div>
                      </td>

                      {/* Team B */}
                      <td className="px-4 py-3 text-center bg-purple-50/30">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-emerald-600 font-medium">{stat.teamB.had}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-rose-600 font-medium">{stat.teamB.no}</span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-gray-700">{stat.total.had}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-gray-700">{stat.total.no}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Nincs adat erre az évre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {historyMonthlyStats.length > 0 ? (
              historyMonthlyStats.map((stat, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-900 mb-3">{stat.name}</h3>
                  <div className="space-y-3">
                    {/* Team A */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                      <span className="text-xs font-medium text-blue-700">A csapat</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-600 font-bold">{stat.teamA.had}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-rose-600 font-bold">{stat.teamA.no}</span>
                      </div>
                    </div>

                    {/* Team B */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/50 border border-purple-100">
                      <span className="text-xs font-medium text-purple-700">B csapat</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-600 font-bold">{stat.teamB.had}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-rose-600 font-bold">{stat.teamB.no}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-xs font-medium text-gray-500">Összesen</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-medium text-gray-700">{stat.total.had}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                          <span className="text-sm font-medium text-gray-700">{stat.total.no}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Nincs adat erre az évre.
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Volt kaja</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Nem volt</div>
          </div>
        </div>
      ) : activeTab === "general" ? (
        <>
          {/* Weekly Stats */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Heti összesítő
            </h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <GeneralSummaryCard
                  hadMeal={generalWeekly.had_meal}
                  noMeal={generalWeekly.no_meal}
                  totalDays={generalWeekly.total_days}
                  period="weekly"
                />
              </div>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Havi összesítő
            </h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <GeneralSummaryCard
                  hadMeal={generalMonthly.had_meal}
                  noMeal={generalMonthly.no_meal}
                  totalDays={generalMonthly.total_days}
                  period="monthly"
                />
              </div>
            </div>
          </div>

          {/* Yearly Stats */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Éves összesítő
            </h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <GeneralSummaryCard
                  hadMeal={generalYearly.had_meal}
                  noMeal={generalYearly.no_meal}
                  totalDays={generalYearly.total_days}
                  period="yearly"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Weekly Team Summary */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Heti összesítő
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamStats.map((team) => (
                <TeamSummaryCard
                  key={`weekly-${team.team}`}
                  team={team.team}
                  teamName={team.team === "A" ? "Zs csapat" : "Reni csapat"}
                  hadMeal={team.weekly.had_meal}
                  noMeal={team.weekly.no_meal}
                  totalDays={team.weekly.total_days}
                  period="weekly"
                />
              ))}
            </div>
          </div>

          {/* Monthly Team Summary */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Havi összesítő
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamStats.map((team) => (
                <TeamSummaryCard
                  key={`monthly-${team.team}`}
                  team={team.team}
                  teamName={team.team === "A" ? "Zs csapat" : "Reni csapat"}
                  hadMeal={team.monthly.had_meal}
                  noMeal={team.monthly.no_meal}
                  totalDays={team.monthly.total_days}
                  period="monthly"
                />
              ))}
            </div>
          </div>

          {/* Yearly Team Summary */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Éves összesítő
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamStats.map((team) => (
                <TeamSummaryCard
                  key={`yearly-${team.team}`}
                  team={team.team}
                  teamName={team.team === "A" ? "Zs csapat" : "Reni csapat"}
                  hadMeal={team.yearly.had_meal}
                  noMeal={team.yearly.no_meal}
                  totalDays={team.yearly.total_days}
                  period="yearly"
                />
              ))}
            </div>
          </div>
        </>
      )
      }
    </div >
  )
}


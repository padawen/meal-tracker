import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { UserStat } from "./UserLeaderboard"

interface UserCompletionRatioProps {
    userStats: UserStat[]
    elapsedDays: number
    totalDays: number
    elapsedHolidays: number
    totalHolidays: number
    title?: string
    isCurrentYear?: boolean
}

export function UserCompletionRatio({
    userStats,
    elapsedDays,
    totalDays,
    elapsedHolidays,
    totalHolidays,
    title = "Kitöltési arányok",
    isCurrentYear = false
}: UserCompletionRatioProps) {
    const totalRecords = userStats.reduce((acc, curr) => acc + curr.recordCount, 0);
    const netElapsedDays = elapsedDays - elapsedHolidays;
    const netTotalDays = totalDays - totalHolidays;

    const chartData = userStats.map(stat => ({
        name: stat.fullName,
        value: stat.recordCount
    }));

    const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    const completionRate = netElapsedDays > 0 ? (totalRecords / netElapsedDays) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-[#1F2937]">{title}</h3>
                <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Munkanap / Rögzítés</p>
                    <p className="text-lg font-bold text-indigo-600">{totalRecords} / {netElapsedDays} nap</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                        ({isCurrentYear ? 'Évi összes' : 'Összesen'}: {netTotalDays} munkanap)
                    </p>
                </div>
            </div>

            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', paddingTop: '30px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 flex flex-col gap-2">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 text-center font-medium">
                        {isCurrentYear ? 'Az idei évből eddig' : 'Ebben az évben'} <span className="font-bold">{netElapsedDays}</span> munkanap telt el,
                        amiből <span className="font-bold">{totalRecords}</span> nap lett rögzítve.
                        Ez <span className="font-bold">{completionRate.toFixed(1)}%</span>-os kitöltöttségi arány!
                    </p>
                </div>
                {elapsedHolidays > 0 && (
                    <p className="text-[10px] text-gray-400 text-center italic">
                        * A számítás nem tartalmazza {isCurrentYear ? 'az idei év' : 'az adott év'} {elapsedHolidays} szünnapját.
                    </p>
                )}
            </div>
        </div>
    );
}

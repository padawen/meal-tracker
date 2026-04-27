import Link from 'next/link'
import type { Route } from 'next'

interface TabItem<T extends string> {
    key: T
    label: string
    href?: Route
}

interface TabNavigationProps<T extends string> {
    tabs: TabItem<T>[]
    activeTab: T
    onTabChange?: (tab: T) => void
    size?: "sm" | "md"
}

export function TabNavigation<T extends string>({
    tabs, activeTab, onTabChange, size = "md"
}: TabNavigationProps<T>) {
    const textSize = size === "sm" ? "text-xs" : "text-sm"
    return (
        <div className="flex justify-center">
            <div className="bg-[#F3F4F6] rounded-xl p-1 inline-flex flex-wrap justify-center gap-0.5">
                {tabs.map(tab => (
                    tab.href ? (
                        <Link
                            key={tab.key}
                            href={tab.href as Route}
                            onClick={() => onTabChange?.(tab.key)}
                            className={`px-4 py-2 ${textSize} font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${activeTab === tab.key
                                ? "bg-white text-[#1F2937] shadow-sm"
                                : "text-[#6B7280] hover:text-[#1F2937]"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    ) : (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange?.(tab.key)}
                            className={`px-4 py-2 ${textSize} font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${activeTab === tab.key
                                ? "bg-white text-[#1F2937] shadow-sm"
                                : "text-[#6B7280] hover:text-[#1F2937]"
                                }`}
                        >
                            {tab.label}
                        </button>
                    )
                ))}
            </div>
        </div>
    )
}

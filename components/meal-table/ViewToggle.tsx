interface ViewToggleProps {
    view: "week" | "month"
    onViewChange: (view: "week" | "month") => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
    return (
        <div className="flex justify-center">
            <div className="bg-[#F3F4F6] rounded-xl p-1 inline-flex">
                <button
                    onClick={() => onViewChange("week")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${view === "week"
                            ? "bg-white text-[#1F2937] shadow-sm"
                            : "text-[#6B7280] hover:text-[#1F2937]"
                        }`}
                >
                    Heti nézet
                </button>
                <button
                    onClick={() => onViewChange("month")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${view === "month"
                            ? "bg-white text-[#1F2937] shadow-sm"
                            : "text-[#6B7280] hover:text-[#1F2937]"
                        }`}
                >
                    Havi nézet
                </button>
            </div>
        </div>
    )
}

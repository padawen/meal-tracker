import { ChevronLeft, ChevronRight } from "lucide-react"

interface NavProps {
    label: string
    onPrev: () => void
    onNext: () => void
    canPrev?: boolean
    canNext?: boolean
}

export function Nav({ label, onPrev, onNext, canPrev = true, canNext = true }: NavProps) {
    return (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E5E7EB] p-2 shadow-sm">
            <button
                onClick={onPrev}
                disabled={!canPrev}
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${canPrev
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 cursor-pointer'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                aria-label="Előző"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="px-4 py-2 text-sm font-semibold text-[#1F2937]">
                {label}
            </span>

            <button
                onClick={onNext}
                disabled={!canNext}
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${canNext
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 cursor-pointer'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                aria-label="Következő"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    )
}

import { UtensilsCrossed } from "lucide-react"
import { ReactNode } from "react"

interface HeaderProps {
    title: string
    description: string
    icon?: ReactNode
    iconBgColor?: string
}

export function Header({
    title,
    description,
    icon,
    iconBgColor = "bg-indigo-100"
}: HeaderProps) {
    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0`}>
                    {icon || <UtensilsCrossed className="w-5 h-5 text-indigo-600" />}
                </div>
                <div>
                    <h2 className="font-semibold text-[#1F2937] mb-1">{title}</h2>
                    <p className="text-sm text-[#6B7280]">{description}</p>
                </div>
            </div>
        </div>
    )
}

import { TabNavigation } from "@/components/shared"

interface ViewToggleProps {
    view: "week" | "month" | "year"
    onViewChange: (view: "week" | "month" | "year") => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
    return (
        <TabNavigation
            tabs={[
                { key: "week", label: "Heti nézet" },
                { key: "month", label: "Havi nézet" },
                { key: "year", label: "Éves nézet" },
            ]}
            activeTab={view}
            onTabChange={onViewChange}
        />
    )
}

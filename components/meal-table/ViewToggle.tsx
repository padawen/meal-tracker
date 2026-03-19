import { TabNavigation } from "@/components/shared"

interface ViewToggleProps {
    view: "week" | "month"
    onViewChange: (view: "week" | "month") => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
    return (
        <TabNavigation
            tabs={[
                { key: "week", label: "Heti nézet" },
                { key: "month", label: "Havi nézet" },
            ]}
            activeTab={view}
            onTabChange={onViewChange}
        />
    )
}

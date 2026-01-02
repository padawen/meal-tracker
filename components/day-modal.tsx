"use client"

import { useState, useEffect } from "react"
import { X, Check, XIcon, Trash2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface DayData {
  date: Date
  status: "volt" | "nem" | "empty"
  food?: string
  reason?: string
  recordedBy?: string
  recordedAt?: string
  team?: "A" | "B"
}

interface DayModalProps {
  day: DayData
  onClose: () => void
  onSave: (day: DayData, hadFood: boolean, details: string, team?: "A" | "B") => void
  onDelete?: (day: DayData) => void
}

export function DayModal({ day, onClose, onSave, onDelete }: DayModalProps) {
  const [hadFood, setHadFood] = useState<boolean | null>(
    day.status === "volt" ? true : day.status === "nem" ? false : null,
  )
  const [details, setDetails] = useState(day.food || day.reason || "")
  const [team, setTeam] = useState<"A" | "B" | null>(day.team || null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [foodSuggestions, setFoodSuggestions] = useState<string[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  // Fetch existing meal names from database
  useEffect(() => {
    const fetchMealNames = async () => {
      const { data } = await supabase
        .from('meal_records')
        .select('meal_name')
        .not('meal_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<Array<{ meal_name: string | null }>>()

      if (data) {
        // Get unique meal names
        const uniqueMeals = Array.from(new Set(data.map(r => r.meal_name).filter(Boolean))) as string[]
        setFoodSuggestions(uniqueMeals)
      }
    }

    fetchMealNames()
  }, [])

  useEffect(() => {
    if (hadFood && details) {
      const filtered = foodSuggestions.filter((s) => s.toLowerCase().includes(details.toLowerCase()))
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0 && details.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [details, hadFood, foodSuggestions])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSave = () => {
    if (hadFood !== null) {
      onSave(day, hadFood, details, team || undefined)
    }
  }

  const handleDelete = () => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a rekordot?')) {
      onDelete?.(day)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle - Mobile */}
        <div className="flex md:hidden justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1F2937]">Kaja rögzítése</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date */}
          <div className="text-center pb-2">
            <p className="text-sm text-[#6B7280]">Kiválasztott nap</p>
            <p className="text-xl font-semibold text-[#1F2937]">{formatDate(day.date)}</p>
          </div>

          {/* Question */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#1F2937]">Volt személyzeti étkezés ezen a napon?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setHadFood(true)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${hadFood === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-[#E5E7EB] hover:border-emerald-300 text-[#6B7280]"
                  }`}
              >
                <Check className="w-5 h-5" />
                <span className="font-medium">Igen</span>
              </button>
              <button
                onClick={() => setHadFood(false)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${hadFood === false
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-[#E5E7EB] hover:border-rose-300 text-[#6B7280]"
                  }`}
              >
                <XIcon className="w-5 h-5" />
                <span className="font-medium">Nem</span>
              </button>
            </div>
          </div>

          {/* Details Input */}
          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="details" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Mit ettünk?" : "Miért nem volt kaja?"}
              </Label>
              <div className="relative">
                <Input
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={hadFood ? "Pl. Csirkepaprikás" : "Pl. Szabadnap"}
                  className="h-12 rounded-xl border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500"
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-10 overflow-hidden">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setDetails(suggestion)
                          setShowSuggestions(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-[#F3F4F6] transition-colors border-b border-[#E5E7EB] last:border-0"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Selection */}
          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="team" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Melyik csapattól kaptuk?" : "Melyik csapat dolgozik ezen a napon?"}
              </Label>
              <Select value={team || ""} onValueChange={(value) => setTeam(value as "A" | "B")}>
                <SelectTrigger className="w-full h-12 rounded-xl border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500">
                  <SelectValue placeholder="Válassz csapatot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A csapat</SelectItem>
                  <SelectItem value="B">B csapat</SelectItem>
                </SelectContent>
              </Select>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>A csapat</strong> = Zs csapat, <strong>B csapat</strong> = Reni csapat
                </p>
              </div>
            </div>
          )}

          {/* Info Text */}
          <p className="text-xs text-[#9CA3AF] text-center">
            Egy naphoz egy bejegyzés tartozik, de később módosítható.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          {/* Delete button - only show if there's an existing record */}
          {day.status !== "empty" && onDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 bg-transparent flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Törlés
            </Button>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] bg-transparent"
            >
              Mégse
            </Button>
            <Button
              onClick={handleSave}
              disabled={hadFood === null}
              className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              Mentés
            </Button>
          </div>
        </div>
      </div>
    </div >
  )
}

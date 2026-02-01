"use client"

import { useState } from "react"
import { X, Check, XIcon, Trash2 } from "lucide-react"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - Always mobile bottom sheet style */}
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        {/* Handle - Always visible */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1F2937]">Kaja rögzítése</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors cursor-pointer"
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
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${hadFood === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-[#E5E7EB] hover:border-emerald-300 text-[#6B7280]"
                  }`}
              >
                <Check className="w-5 h-5" />
                <span className="font-medium">Igen</span>
              </button>
              <button
                onClick={() => setHadFood(false)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${hadFood === false
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
              <Input
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={hadFood ? "Pl. Csirkepaprikás" : "Pl. Szabadnap"}
                className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Team Selection */}
          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="team" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Melyik csapattól kaptuk?" : "Melyik csapat dolgozik ezen a napon?"}
              </Label>
              <Select value={team || ""} onValueChange={(value) => setTeam(value as "A" | "B")}>
                <SelectTrigger className="w-full h-12 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer bg-white">
                  <SelectValue placeholder="Válassz csapatot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Zs csapat</SelectItem>
                  <SelectItem value="B">R csapat</SelectItem>
                </SelectContent>
              </Select>
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
              className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 bg-transparent flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Törlés
            </Button>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] bg-transparent cursor-pointer"
            >
              Mégse
            </Button>
            <Button
              onClick={handleSave}
              disabled={hadFood === null}
              className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer"
            >
              Mentés
            </Button>
          </div>
        </div>
      </div>
    </div >
  )
}

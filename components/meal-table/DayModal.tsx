"use client"

import { useState } from "react"
import { X, Check, XIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAuth } from "@/components/auth/AuthGuard"

interface DayData {
  date: Date
  status: "volt" | "nem" | "empty"
  food?: string
  reason?: string
  recordedBy?: string
  recordedByUserId?: string
  recordedAt?: string
  team?: "A" | "B"
}

interface DayModalProps {
  day: DayData
  onClose: () => void
  onSave: (day: DayData, hadFood: boolean, details: string, team?: "A" | "B") => void
  onDelete?: (day: DayData) => void
  isSaving?: boolean
  isDeletePending?: boolean
}

export function DayModal({ day, onClose, onSave, onDelete, isSaving = false, isDeletePending = false }: DayModalProps) {
  const { user } = useAuth()
  const canEdit = day.status === "empty" || day.recordedByUserId === user?.id
  const isBusy = isSaving || isDeletePending

  const getSuggestedTeam = (date: Date): "A" | "B" => {

    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    const isEvenWeek = weekNo % 2 === 0;
    const day = date.getDay();

    const isWeekendSide = [1, 2, 5, 6, 0].includes(day);

    if (isEvenWeek) {
      return isWeekendSide ? "B" : "A";
    } else {
      return isWeekendSide ? "A" : "B";
    }
  }

  const [hadFood, setHadFood] = useState<boolean | null>(
    day.status === "volt" ? true : day.status === "nem" ? false : null,
  )
  const [details, setDetails] = useState(day.food || day.reason || "")
  const [team, setTeam] = useState<"A" | "B">(day.team || getSuggestedTeam(day.date))
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

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

  const handleDeleteConfirm = () => {
    onDelete?.(day)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isBusy ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1F2937]">Kaja rögzítése</h2>
              <button
            disabled={isBusy}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center pb-2">
            <p className="text-sm text-[#6B7280]">Kiválasztott nap</p>
            <p className="text-xl font-semibold text-[#1F2937]">{formatDate(day.date)}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#1F2937]">Volt személyzeti étkezés ezen a napon?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={!canEdit || isBusy}
                aria-pressed={hadFood === true}
                onClick={() => setHadFood(true)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${hadFood === true
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-[#E5E7EB] hover:border-emerald-300 text-[#6B7280]"
                  } ${!canEdit || isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Check className="w-5 h-5" />
                <span className="font-medium">Igen</span>
              </button>
              <button
                disabled={!canEdit || isBusy}
                aria-pressed={hadFood === false}
                onClick={() => setHadFood(false)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${hadFood === false
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-[#E5E7EB] hover:border-rose-300 text-[#6B7280]"
                  } ${!canEdit || isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <XIcon className="w-5 h-5" />
                <span className="font-medium">Nem</span>
              </button>
            </div>
          </div>

          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="details" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Mit ettünk?" : "Miért nem volt kaja?"}
              </Label>
              <Input
                id="details"
                disabled={!canEdit || isBusy}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={hadFood ? "Pl. Csirkepaprikás" : "Pl. Szabadnap"}
                className={`h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500 ${!canEdit || isBusy ? "bg-gray-50 text-gray-400" : ""}`}
              />
            </div>
          )}

          {hadFood !== null && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="team" className="text-sm font-medium text-[#1F2937]">
                {hadFood ? "Melyik csapattól kaptuk?" : "Melyik csapat dolgozik ezen a napon?"}
              </Label>
              <Select disabled={!canEdit || isBusy} value={team || ""} onValueChange={(value) => setTeam(value as "A" | "B")}>
                <SelectTrigger className={`w-full h-12 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer bg-white ${!canEdit || isBusy ? "bg-gray-50 text-gray-400" : ""}`}>
                  <SelectValue placeholder="Válassz csapatot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Zs csapat</SelectItem>
                  <SelectItem value="B">R csapat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!canEdit && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
              <XIcon className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Ezt a bejegyzést <span className="font-semibold">{day.recordedBy}</span> hozta létre. Csak ő módosíthatja.
              </p>
            </div>
          )}

          <p className="text-xs text-[#9CA3AF] text-center">
            Egy naphoz egy bejegyzés tartozik.
          </p>
        </div>
        <div className="px-6 pb-6 pt-2 space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="flex-1 h-12 rounded-xl border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] bg-transparent cursor-pointer"
            >
              Mégse
            </Button>
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={hadFood === null || isBusy}
                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer inline-flex items-center justify-center"
              >
                {isSaving ? <Spinner className="size-4 text-white" /> : "Mentés"}
              </Button>
            )}
          </div>
          {canEdit && day.status !== "empty" && (
            isDeleteConfirmOpen ? (
              <div className="space-y-3 p-4 bg-rose-50/50 rounded-xl border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-sm text-center text-rose-800 font-medium">Biztosan törölni szeretnéd a bejegyzést?</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isBusy}
                    className="flex-1 h-10 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-100 bg-transparent cursor-pointer"
                  >
                    Mégse
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={isBusy}
                    className="flex-1 h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer inline-flex items-center justify-center"
                  >
                    {isDeletePending ? <Spinner className="size-4 text-white" /> : "Végleges törlés"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isBusy}
                className="w-full h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-transparent cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Törlés
              </Button>
            )
          )}
        </div>
      </div>
    </div >
  )
}

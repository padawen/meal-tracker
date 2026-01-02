"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface Holiday {
    id: string
    date: string
    name: string
    description: string | null
    created_at: string
}

export function HolidaysManager() {
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [newHoliday, setNewHoliday] = useState({
        date: "",
        name: "",
        description: ""
    })
    const { toast } = useToast()

    const fetchHolidays = async () => {
        try {
            const { data, error } = await supabase
                .from('holidays')
                .select('*')
                .order('date', { ascending: true })

            if (error) throw error
            setHolidays(data || [])
        } catch (error) {
            console.error('Error fetching holidays:', error)
            toast({
                title: "Hiba",
                description: "Nem sikerült betölteni a szünnapokat",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHolidays()
    }, [])

    const handleAdd = async () => {
        if (!newHoliday.date || !newHoliday.name) {
            toast({
                title: "Hiányzó adatok",
                description: "Kérlek add meg a dátumot és a nevet",
                variant: "destructive"
            })
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const { error } = await supabase
                .from('holidays')
                .insert({
                    date: newHoliday.date,
                    name: newHoliday.name,
                    description: newHoliday.description || null,
                    created_by: user.id
                })

            if (error) throw error

            toast({
                title: "Sikeres hozzáadás",
                description: `${newHoliday.name} hozzáadva`
            })

            setNewHoliday({ date: "", name: "", description: "" })
            setOpen(false)
            fetchHolidays()
        } catch (error) {
            console.error('Error adding holiday:', error)
            toast({
                title: "Hiba",
                description: "Nem sikerült hozzáadni a szünnapot",
                variant: "destructive"
            })
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Biztosan törölni szeretnéd: ${name}?`)) return

        try {
            const { error } = await supabase
                .from('holidays')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({
                title: "Törölve",
                description: `${name} törölve`
            })

            fetchHolidays()
        } catch (error) {
            console.error('Error deleting holiday:', error)
            toast({
                title: "Hiba",
                description: "Nem sikerült törölni a szünnapot",
                variant: "destructive"
            })
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString("hu-HU", {
            year: "numeric",
            month: "long",
            day: "numeric"
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-[#1F2937]">Szünnapok kezelése</h2>
                            <p className="text-sm text-[#6B7280]">Ezek a napok nem számítanak bele a statisztikába</p>
                        </div>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-10 px-4">
                                <Plus className="w-4 h-4 mr-2" />
                                Új szünnap
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Új szünnap hozzáadása</DialogTitle>
                                <DialogDescription>
                                    Add meg a szünnap adatait. Ezek a napok ki lesznek zárva a statisztikákból.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Dátum *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={newHoliday.date}
                                        onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Név *</Label>
                                    <Input
                                        id="name"
                                        placeholder="pl. Karácsony"
                                        value={newHoliday.name}
                                        onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Megjegyzés (opcionális)</Label>
                                    <Input
                                        id="description"
                                        placeholder="pl. Nemzeti ünnep"
                                        value={newHoliday.description}
                                        onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    className="flex-1 h-12 rounded-xl"
                                >
                                    Mégse
                                </Button>
                                <Button
                                    onClick={handleAdd}
                                    className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700"
                                >
                                    Hozzáad
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-purple-50 rounded-2xl border border-purple-200 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-sm text-purple-800">
                        A szünnapokon (pl. ünnepnapok, céges szünet) nem számít be a statisztikába, ha nem volt kaja.
                        Ezek a napok automatikusan kizárásra kerülnek az elemzésekből.
                    </p>
                </div>
            </div>

            {/* Holidays List */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E7EB]">
                    <h3 className="font-semibold text-[#1F2937]">
                        Rögzített szünnapok ({holidays.length})
                    </h3>
                </div>
                {holidays.length > 0 ? (
                    <div className="divide-y divide-[#E5E7EB]">
                        {holidays.map((holiday) => (
                            <div key={holiday.id} className="p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors">
                                <div className="flex-1">
                                    <p className="font-medium text-[#1F2937]">{holiday.name}</p>
                                    <p className="text-sm text-[#6B7280]">{formatDate(holiday.date)}</p>
                                    {holiday.description && (
                                        <p className="text-xs text-[#9CA3AF] mt-1">{holiday.description}</p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(holiday.id, holiday.name)}
                                    className="text-rose-600 hover:bg-rose-50 rounded-lg h-9 px-3"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
                            <Calendar className="w-6 h-6 text-[#9CA3AF]" />
                        </div>
                        <p className="text-sm text-[#6B7280]">Még nincsenek szünnapok rögzítve.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

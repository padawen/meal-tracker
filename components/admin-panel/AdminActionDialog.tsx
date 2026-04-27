'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import type { AdminConfirmData } from './types'

interface AdminActionDialogProps {
  confirmData: AdminConfirmData | null
  isOpen: boolean
  isPending: boolean
  onConfirm: (data: AdminConfirmData) => void
  onOpenChange: (open: boolean) => void
}

function getDialogTitle(confirmData: AdminConfirmData | null) {
  if (confirmData?.type === 'admin') {
    return confirmData.isAdmin ? 'Admin jog visszavonása' : 'Admin jog megadása'
  }

  if (confirmData?.type === 'approve') {
    return 'Felhasználó jóváhagyása'
  }

  return 'Hozzáférés visszavonása'
}

function getDialogDescription(confirmData: AdminConfirmData | null) {
  if (!confirmData) return null

  if (confirmData.type === 'admin') {
    return (
      <>
        Biztosan {confirmData.isAdmin ? 'visszavonod' : 'megadod'} az adminisztrátori jogosultságot
        <span className="font-semibold text-gray-900 mx-1">{confirmData.name}</span>
        részére?
      </>
    )
  }

  if (confirmData.type === 'approve') {
    return (
      <>
        Biztosan jóváhagyod
        <span className="font-semibold text-gray-900 mx-1">{confirmData.name}</span>
        hozzáférését az alkalmazáshoz?
      </>
    )
  }

  return (
    <>
      Biztosan elutasítod vagy visszavonod a hozzáférést
      <span className="font-semibold text-gray-900 mx-1">{confirmData.name}</span>
      felhasználótól? Ezt követően nem tudja majd használni az alkalmazást.
    </>
  )
}

export function AdminActionDialog({
  confirmData,
  isOpen,
  isPending,
  onConfirm,
  onOpenChange,
}: AdminActionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getDialogTitle(confirmData)}</AlertDialogTitle>
          <AlertDialogDescription>{getDialogDescription(confirmData)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isPending}>
            Mégse
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirmData) {
                onConfirm(confirmData)
              }
            }}
            className={`${confirmData?.type === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white cursor-pointer`}
            disabled={isPending || !confirmData}
          >
            Mehet
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

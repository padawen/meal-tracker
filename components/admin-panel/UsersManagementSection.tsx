'use client'

import { Check, Clock, Mail, Shield, User, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared'

import type { AdminConfirmData, UserData } from './types'

interface UsersManagementSectionProps {
  currentUserId: string
  isCurrentUserMasterAdmin: boolean
  masterAdminIds: string[]
  onRequestAction: (data: AdminConfirmData) => void
  users: UserData[]
}

function getDisplayName(user: UserData) {
  return user.full_name || user.email.split('@')[0]
}

function getStatusBadge(user: UserData) {
  if (user.is_admin) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <Shield className="w-3 h-3" />
        Admin
      </span>
    )
  }

  if (user.is_approved) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <Check className="w-3 h-3" />
        Engedélyezve
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" />
      Függőben
    </span>
  )
}

export function UsersManagementSection({
  currentUserId,
  isCurrentUserMasterAdmin,
  masterAdminIds,
  onRequestAction,
  users,
}: UsersManagementSectionProps) {
  const pendingUsers = users.filter((user) => !user.is_approved && !user.is_admin)
  const approvedUsers = users.filter((user) => user.is_approved || user.is_admin)

  return (
    <>
      <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-sm text-indigo-800">
            Csak az engedélyezett felhasználók tudják használni az alkalmazást. A függőben lévő kérelmeket itt lehet
            jóváhagyni vagy elutasítani.
          </p>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] bg-amber-50">
            <h2 className="font-semibold text-[#1F2937] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Függőben lévő kérelmek ({pendingUsers.length})
            </h2>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {pendingUsers.map((user) => (
              <div key={user.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarUrl={user.avatar_url} name={user.full_name || user.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1F2937]">{getDisplayName(user)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#6B7280] flex items-center gap-1 break-all">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {user.email}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onRequestAction({
                          id: user.id,
                          name: getDisplayName(user),
                          type: 'approve',
                        })
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 cursor-pointer"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Engedélyez
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onRequestAction({
                          id: user.id,
                          name: getDisplayName(user),
                          type: 'reject',
                        })
                      }}
                      className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg h-9 cursor-pointer"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Elutasít
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1F2937] flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            Engedélyezett felhasználók ({approvedUsers.length})
          </h2>
        </div>
        {approvedUsers.length > 0 ? (
          <div className="divide-y divide-[#E5E7EB]">
            {approvedUsers.map((user) => {
              const isTargetAdmin = user.is_admin
              const isTargetMaster = masterAdminIds.includes(user.id)
              const canModifySelf = user.id !== currentUserId

              return (
                <div key={user.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar avatarUrl={user.avatar_url} name={user.full_name || user.email} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1F2937]">{getDisplayName(user)}</p>
                        {getStatusBadge(user)}
                      </div>
                    </div>
                    <p className="text-sm text-[#6B7280] flex items-center gap-1 break-all">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      {user.email}
                    </p>
                    {!isTargetMaster && (
                      <>
                        {isTargetAdmin ? (
                          isCurrentUserMasterAdmin && canModifySelf ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onRequestAction({
                                  id: user.id,
                                  name: getDisplayName(user),
                                  type: 'admin',
                                  isAdmin: true,
                                })
                              }}
                              className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg h-9 cursor-pointer"
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Admin jog visszavonása
                            </Button>
                          ) : null
                        ) : (
                          <div className="flex gap-2">
                            {isCurrentUserMasterAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onRequestAction({
                                    id: user.id,
                                    name: getDisplayName(user),
                                    type: 'admin',
                                    isAdmin: false,
                                  })
                                }}
                                className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg h-9 cursor-pointer"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Admin jog
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onRequestAction({
                                  id: user.id,
                                  name: getDisplayName(user),
                                  type: 'reject',
                                })
                              }}
                              className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg h-9 cursor-pointer"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Visszavon
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-[#9CA3AF]" />
            </div>
            <p className="text-sm text-[#6B7280]">Még nincsenek engedélyezett felhasználók.</p>
          </div>
        )}
      </div>
    </>
  )
}

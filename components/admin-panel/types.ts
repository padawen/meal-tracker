'use client'

export interface UserData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_approved: boolean
  created_at: string
}

export interface AdminConfirmData {
  id: string
  name: string
  type: 'admin' | 'reject' | 'approve'
  isAdmin?: boolean
}

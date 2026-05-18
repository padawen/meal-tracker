import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeInternalNextPath(value?: string | null) {
  if (!value) return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  if (value.includes('\\')) return '/'

  return value
}

export function sanitizeNextPath(value?: string | null) {
  const normalizedPath = normalizeInternalNextPath(value)
  const url = new URL(normalizedPath, 'http://localhost')

  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  url.searchParams.delete('code')

  const search = url.searchParams.toString()
  return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
}

export const getRedirectUrl = (nextPath = '/') => {
  const nextParam = encodeURIComponent(normalizeInternalNextPath(nextPath))
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback?next=${nextParam}`
  }
  return process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${nextParam}`
    : `http://localhost:3000/auth/callback?next=${nextParam}`
}

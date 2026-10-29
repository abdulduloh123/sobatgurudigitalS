import type { MatchTier } from '../types'

const relative = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '-'
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'baru saja'
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export const TIERS: Record<MatchTier, { label: string; className: string }> = {
  frasa: { label: 'Frasa persis', className: 'bg-emerald-100 text-emerald-800' },
  semua: { label: 'Semua kata ada', className: 'bg-blue-100 text-blue-800' },
  sebagian: { label: 'Sebagian kata', className: 'bg-amber-100 text-amber-800' },
  judul: { label: 'Cocok menurut Drive', className: 'bg-slate-100 text-slate-600' },
}

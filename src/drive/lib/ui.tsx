import type { Segment } from '../types'

const TYPES: Record<string, { label: string; className: string }> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', className: 'bg-blue-100 text-blue-800' },
  'application/msword': { label: 'DOC', className: 'bg-indigo-100 text-indigo-800' },
  'application/vnd.google-apps.document': { label: 'Google Docs', className: 'bg-sky-100 text-sky-800' },
}

export function TypeBadge({ mimeType }: { mimeType: string }) {
  const type = TYPES[mimeType] ?? { label: 'Dokumen', className: 'bg-slate-100 text-slate-700' }
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${type.className}`}>{type.label}</span>
}

export function Passage({ segments }: { segments: Segment[] }) {
  return (
    <p className="text-sm leading-relaxed text-slate-700">
      {segments.map((segment, index) => segment.hit
        ? <mark key={index} className="rounded bg-yellow-200/80 px-0.5 font-semibold text-slate-900">{segment.text}</mark>
        : <span key={index}>{segment.text}</span>)}
    </p>
  )
}

/** Highlights query words inside short text such as a file name. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])]
  if (!words.length) return <>{text}</>
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu')
  return <>{text.split(pattern).map((part, index) => index % 2
    ? <mark key={index} className="rounded bg-yellow-200/80 px-0.5 text-inherit">{part}</mark>
    : part)}</>
}

import { useEffect, useMemo, useState } from 'react'
import { FileDown, LoaderCircle, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { listDownloadLogs } from '../lib/api'
import { formatDate } from '../lib/format'
import type { DownloadLog } from '../types'

function toCsv(rows: DownloadLog[]) {
  const cell = (value: string | null) => `"${(value ?? '').replace(/"/g, '""')}"`
  const header = ['Waktu', 'CS', 'Guru', 'Catatan', 'File', 'Folder']
  const lines = rows.map((row) => [formatDate(row.createdAt), row.userName, row.guru, row.catatan, row.fileName, row.path].map(cell).join(','))
  return [header.join(','), ...lines].join('\n')
}

export default function Logs() {
  const [logs, setLogs] = useState<DownloadLog[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [reloading, setReloading] = useState(false)

  const fetchLogs = () => listDownloadLogs().then((rows) => { setLogs(rows); setError('') })
    .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Gagal memuat log.'))

  async function load() {
    setReloading(true)
    await fetchLogs()
    setReloading(false)
  }

  useEffect(() => { void fetchLogs() }, [])

  const shown = useMemo(() => {
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean)
    return (logs ?? []).filter((row) => {
      const hay = `${row.fileName} ${row.userName} ${row.guru ?? ''} ${row.catatan ?? ''} ${row.path ?? ''}`.toLowerCase()
      return words.every((word) => hay.includes(word))
    })
  }, [logs, filter])

  const today = new Date().toDateString()
  const todayCount = (logs ?? []).filter((row) => row.createdAt && new Date(row.createdAt).toDateString() === today).length
  const topFiles = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of logs ?? []) counts.set(row.fileName, (counts.get(row.fileName) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [logs])

  function exportCsv() {
    const blob = new Blob([`\ufeff${toCsv(shown)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `log-unduhan-samples-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Khusus admin</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Log unduhan</h1>
          <p className="text-sm text-slate-500">500 unduhan terakhir oleh CS dan admin.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={reloading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={reloading ? 'animate-spin' : ''} /> Muat ulang
          </button>
          <button onClick={exportCsv} disabled={!shown.length} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
            <FileDown size={16} /> Unduh CSV
          </button>
        </div>
      </div>

      {logs && <section className="grid gap-3 md:grid-cols-[200px_200px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-2xl font-bold">{todayCount.toLocaleString('id-ID')}</div><div className="text-xs text-slate-500">Unduhan hari ini</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-2xl font-bold">{logs.length.toLocaleString('id-ID')}</div><div className="text-xs text-slate-500">Total di daftar</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Paling sering diunduh</div>
          {topFiles.length ? <ol className="space-y-0.5 text-sm">{topFiles.map(([name, count]) => <li key={name} className="flex justify-between gap-3">
            <button onClick={() => setFilter(name)} className="truncate text-left text-slate-700 hover:text-blue-800">{name}</button><span className="shrink-0 text-slate-400">{count}×</span>
          </li>)}</ol> : <p className="text-sm text-slate-400">Belum ada data.</p>}
        </div>
      </section>}

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Saring berdasarkan file, CS, guru, atau catatan…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><TriangleAlert size={18} className="shrink-0" />{error}</div>}
      {!logs && !error && <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Memuat log…</div>}

      {logs && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">CS</th><th className="px-4 py-3">Guru / catatan</th><th className="px-4 py-3">File</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((row) => <tr key={row.id} className="align-top hover:bg-slate-50/60">
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{row.userName}</td>
              <td className="px-4 py-3 text-slate-700">{row.guru || <span className="text-slate-400">-</span>}{row.catatan && <p className="text-xs text-slate-500">{row.catatan}</p>}</td>
              <td className="px-4 py-3"><p className="text-slate-800">{row.fileName}</p>{row.path && <p className="text-xs text-slate-400">{row.path}</p>}</td>
            </tr>)}
            {!shown.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Tidak ada log yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>}
    </div>
  )
}
